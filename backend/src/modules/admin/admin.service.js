const prisma = require('../../config/prisma');
const { hashPassword } = require('../../utils/hash');
const { removeFile } = require('../cv/cv.service');

// Cùng quy tắc với auth.service (đăng ký)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(`${label} không hợp lệ`, 400);
  }
  return id;
}

function optionalText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Role phải có trong bảng Role (ADMIN | CANDIDATE | RECRUITER)
async function findRoleByName(roleName) {
  const name = typeof roleName === 'string' ? roleName.trim().toUpperCase() : '';
  const role = name ? await prisma.role.findUnique({ where: { name } }) : null;
  if (!role) {
    const roles = await prisma.role.findMany({ select: { name: true }, orderBy: { id: 'asc' } });
    throw createError(`Role phải là một trong: ${roles.map((r) => r.name).join(', ')}`, 400);
  }
  return role;
}

// Admin không được tự khóa, tự đổi role, tự xóa chính mình
function ensureNotSelf(adminId, userId, message) {
  if (adminId === userId) {
    throw createError(message, 400);
  }
}

// ===== Danh sách và chi tiết tài khoản =====

// Lọc theo role, tìm theo email, phân trang (mặc định 1 / 10). KHÔNG trả password.
async function listUsers({ role, email, page, limit } = {}) {
  let currentPage = Number(page);
  if (!Number.isInteger(currentPage) || currentPage <= 0) {
    currentPage = 1;
  }

  let pageSize = Number(limit);
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    pageSize = 10;
  }

  const where = {};
  if (role !== undefined && role !== '') {
    const found = await findRoleByName(role);
    where.roleId = found.id;
  }
  if (typeof email === 'string' && email.trim()) {
    where.email = { contains: email.trim().toLowerCase() };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { name: true } },
        candidateProfile: { select: { fullName: true } },
        recruiterProfile: { select: { fullName: true } },
      },
    }),
  ]);

  const items = users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role.name,
    isActive: user.isActive,
    fullName:
      (user.candidateProfile && user.candidateProfile.fullName) ||
      (user.recruiterProfile && user.recruiterProfile.fullName) ||
      null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  return {
    items,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getUserDetail(userId) {
  const id = parseId(userId, 'Mã tài khoản');

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { name: true } },
      candidateProfile: {
        include: {
          _count: {
            select: { cvs: true, skills: true, experiences: true, educations: true, applications: true },
          },
        },
      },
      recruiterProfile: {
        include: {
          company: true,
          _count: { select: { jobs: true } },
        },
      },
    },
  });

  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }

  return { ...user, role: user.role.name };
}

// ===== Tạo tài khoản Recruiter (đường duy nhất để có Recruiter) =====

async function createRecruiter(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    throw createError('Email không được để trống', 400);
  }
  if (!EMAIL_REGEX.test(email)) {
    throw createError('Email không đúng định dạng', 400);
  }
  if (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, 400);
  }

  const fullName = optionalText(body.fullName);
  if (!fullName) {
    throw createError('Họ tên không được để trống', 400);
  }

  const hasCompanyId = body.companyId !== undefined && body.companyId !== null && body.companyId !== '';
  const companyName = optionalText(body.companyName);
  if (hasCompanyId && companyName) {
    throw createError('Chỉ truyền một trong hai: companyId (công ty có sẵn) hoặc companyName (tạo công ty mới)', 400);
  }
  if (!hasCompanyId && !companyName) {
    throw createError('Cần companyId (công ty có sẵn) hoặc companyName (tạo công ty mới)', 400);
  }

  let existingCompany = null;
  if (hasCompanyId) {
    const companyId = parseId(body.companyId, 'Mã công ty');
    existingCompany = await prisma.company.findUnique({ where: { id: companyId } });
    if (!existingCompany) {
      throw createError('Không tìm thấy công ty', 404);
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw createError('Email đã được sử dụng', 400);
  }

  const recruiterRole = await prisma.role.findUnique({ where: { name: 'RECRUITER' } });
  if (!recruiterRole) {
    throw createError('Chưa có role RECRUITER trong hệ thống, hãy chạy seed trước', 500);
  }

  // Hash trước, không giữ transaction trong lúc bcrypt chạy
  const hashedPassword = await hashPassword(body.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, password: hashedPassword, roleId: recruiterRole.id, isActive: true },
      });

      const company = existingCompany || (await tx.company.create({ data: { name: companyName } }));

      await tx.recruiterProfile.create({
        data: {
          userId: user.id,
          fullName,
          phone: optionalText(body.phone),
          position: optionalText(body.position),
          companyId: company.id,
        },
      });

      return { id: user.id, email: user.email, fullName, company: { id: company.id, name: company.name } };
    });
  } catch (err) {
    // Hai request cùng email chạy song song: request sau vướng unique email
    if (err.code === 'P2002') {
      throw createError('Email đã được sử dụng', 400);
    }
    throw err;
  }
}

// ===== Khóa / mở khóa, đổi role, xóa =====

async function updateUserStatus(adminId, userId, { isActive } = {}) {
  const id = parseId(userId, 'Mã tài khoản');
  ensureNotSelf(adminId, id, 'Không thể tự khóa hoặc mở khóa tài khoản của chính mình');

  if (typeof isActive !== 'boolean') {
    throw createError('isActive phải là true hoặc false', 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }

  const updated = await prisma.user.update({ where: { id }, data: { isActive } });
  return { id: updated.id, email: updated.email, isActive: updated.isActive };
}

async function updateUserRole(adminId, userId, { roleName } = {}) {
  const id = parseId(userId, 'Mã tài khoản');
  ensureNotSelf(adminId, id, 'Không thể tự đổi role của chính mình');

  const role = await findRoleByName(roleName);

  const user = await prisma.user.findUnique({
    where: { id },
    include: { role: true, candidateProfile: true, recruiterProfile: true },
  });
  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }
  if (user.roleId === role.id) {
    throw createError(`Tài khoản đã có role ${role.name}`, 400);
  }

  // Recruiter bắt buộc thuộc một công ty, chỉ tạo được qua POST /admin/recruiters
  if (role.name === 'RECRUITER' && !user.recruiterProfile) {
    throw createError(
      'Tài khoản chưa có hồ sơ nhà tuyển dụng (chưa gắn công ty). Hãy tạo tài khoản Recruiter mới qua POST /api/admin/recruiters',
      400
    );
  }

  await prisma.$transaction(async (tx) => {
    // Chuyển sang CANDIDATE mà chưa có hồ sơ ứng viên thì tạo hồ sơ tối thiểu,
    // giống lúc ứng viên tự đăng ký, để các chức năng của ứng viên dùng được ngay
    if (role.name === 'CANDIDATE' && !user.candidateProfile) {
      const fullName =
        (user.recruiterProfile && user.recruiterProfile.fullName) || user.email.split('@')[0];
      await tx.candidateProfile.create({ data: { userId: user.id, fullName } });
    }

    await tx.user.update({ where: { id: user.id }, data: { roleId: role.id } });
  });

  return { id: user.id, email: user.email, previousRole: user.role.name, role: role.name };
}

async function deleteUser(adminId, userId) {
  const id = parseId(userId, 'Mã tài khoản');
  ensureNotSelf(adminId, id, 'Không thể tự xóa tài khoản của chính mình');

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      candidateProfile: {
        include: {
          cvs: { select: { filePath: true } },
          _count: { select: { applications: true } },
        },
      },
      recruiterProfile: { include: { _count: { select: { jobs: true } } } },
    },
  });
  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }

  // Có dữ liệu tuyển dụng gắn với người khác thì không xóa, chỉ khóa
  const { candidateProfile, recruiterProfile } = user;
  if (recruiterProfile && recruiterProfile._count.jobs > 0) {
    throw createError(
      `Tài khoản đang có ${recruiterProfile._count.jobs} tin tuyển dụng, không thể xóa. Hãy khóa tài khoản thay vì xóa`,
      400
    );
  }
  if (candidateProfile && candidateProfile._count.applications > 0) {
    throw createError(
      `Ứng viên đã có ${candidateProfile._count.applications} đơn ứng tuyển, không thể xóa. Hãy khóa tài khoản thay vì xóa`,
      400
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: id } });

    if (candidateProfile) {
      const where = { candidateProfileId: candidateProfile.id };
      await tx.candidateSkill.deleteMany({ where });
      await tx.candidateExperience.deleteMany({ where });
      await tx.candidateEducation.deleteMany({ where });
      await tx.cV.deleteMany({ where });
      await tx.candidateProfile.delete({ where: { id: candidateProfile.id } });
    }
    if (recruiterProfile) {
      await tx.recruiterProfile.delete({ where: { id: recruiterProfile.id } });
    }

    await tx.user.delete({ where: { id } });
  });

  // Xóa file CV vật lý sau khi DB đã xóa xong; lỗi file chỉ ghi log
  if (candidateProfile) {
    for (const cv of candidateProfile.cvs) {
      await removeFile(cv.filePath);
    }
  }

  return { id };
}

// ===== Công ty =====

async function listCompanies() {
  const companies = await prisma.company.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { recruiters: true, jobs: true } } },
  });

  return companies.map(({ _count, ...company }) => ({
    ...company,
    recruiterCount: _count.recruiters,
    jobCount: _count.jobs,
  }));
}

module.exports = {
  listUsers,
  getUserDetail,
  createRecruiter,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  listCompanies,
};
