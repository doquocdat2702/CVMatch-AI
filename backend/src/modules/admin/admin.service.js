const { ApplicationStatus, CvStatus } = require('@prisma/client');
const prisma = require('../../config/prisma');
const { hashPassword } = require('../../utils/hash');
const { monthKey, lastNMonths, countByPeriod, countByEnum } = require('../../utils/stats');
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

// Hệ thống phục vụ MỘT công ty, do seed tạo từ COMPANY_NAME.
// DB lỡ có nhiều hơn 1 công ty (dữ liệu cũ) thì dùng công ty tạo sớm nhất.
async function getSingleCompany() {
  const company = await prisma.company.findFirst({ orderBy: { id: 'asc' } });
  if (!company) {
    throw createError('Chưa cấu hình công ty, hãy chạy seed', 400);
  }
  return company;
}

// Chặn khóa, hạ role, xóa ADMIN đang hoạt động cuối cùng. user phải kèm role.
async function ensureNotLastActiveAdmin(user) {
  if (user.role.name !== 'ADMIN' || !user.isActive) {
    return;
  }

  const otherActiveAdmins = await prisma.user.count({
    where: { id: { not: user.id }, isActive: true, role: { name: 'ADMIN' } },
  });
  if (otherActiveAdmins === 0) {
    throw createError('Hệ thống phải còn ít nhất một quản trị viên', 400);
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

// Recruiter là HR nội bộ, luôn được gán vào công ty duy nhất của hệ thống
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

  const company = await getSingleCompany();

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

  const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }
  if (!isActive) {
    await ensureNotLastActiveAdmin(user);
  }

  const updated = await prisma.user.update({ where: { id }, data: { isActive } });
  return { id: updated.id, email: updated.email, isActive: updated.isActive };
}

async function updateUserRole(adminId, userId, { roleName } = {}) {
  const id = parseId(userId, 'Mã tài khoản');
  ensureNotSelf(adminId, id, 'Không thể tự đổi role của chính mình');

  const role = await findRoleByName(roleName);

  // Hệ thống chỉ có một quản trị viên (do seed tạo), không nâng ai lên ADMIN
  if (role.name === 'ADMIN') {
    throw createError('Không thể nâng tài khoản lên ADMIN, hệ thống chỉ có một quản trị viên', 400);
  }

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

  // Role mới khác role hiện tại, nên nếu đang là ADMIN thì đây là hạ role
  await ensureNotLastActiveAdmin(user);

  // Chuyển sang RECRUITER mà chưa có hồ sơ nhà tuyển dụng thì cần công ty duy nhất
  // để tạo hồ sơ tối thiểu; lấy trước khi mở transaction
  let company = null;
  if (role.name === 'RECRUITER' && !user.recruiterProfile) {
    company = await getSingleCompany();
  }

  await prisma.$transaction(async (tx) => {
    if (company) {
      const fullName =
        (user.candidateProfile && user.candidateProfile.fullName) || user.email.split('@')[0];
      await tx.recruiterProfile.create({ data: { userId: user.id, fullName, companyId: company.id } });
    }

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
      role: true,
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
  await ensureNotLastActiveAdmin(user);

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

// ===== Đặt lại mật khẩu =====

// Admin đặt mật khẩu mới cho tài khoản khác; mật khẩu của chính mình
// thì đổi qua PUT /api/auth/change-password (cần mật khẩu cũ)
async function updateUserPassword(adminId, userId, { newPassword } = {}) {
  const id = parseId(userId, 'Mã tài khoản');
  ensureNotSelf(
    adminId,
    id,
    'Không thể đặt lại mật khẩu của chính mình tại đây, hãy dùng PUT /api/auth/change-password'
  );

  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw createError(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, 400);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw createError('Không tìm thấy tài khoản', 404);
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

  return { id: user.id, email: user.email };
}

// ===== Trang Tổng quan của Admin =====

// Chỉ dùng count / groupBy, không lưu bảng thống kê riêng
async function getDashboard() {
  const months = lastNMonths(6);

  const [
    roles,
    roleGroups,
    lockedUsers,
    totalJobs,
    openJobs,
    totalApplications,
    applicationStatusGroups,
    newUserGroups,
    cvStatusGroups,
  ] = await Promise.all([
    prisma.role.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true } }),
    prisma.user.groupBy({ by: ['roleId'], _count: { _all: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.job.count(),
    prisma.job.count({ where: { isOpen: true } }),
    prisma.application.count(),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: months.start } },
      _count: { _all: true },
    }),
    prisma.cV.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const usersByRoleId = new Map(roleGroups.map((group) => [group.roleId, group._count._all]));
  const cvByStatus = countByEnum(cvStatusGroups, 'status', Object.values(CvStatus));

  // Tỉ lệ trích xuất thành công = COMPLETED / (COMPLETED + FAILED), chưa có CV xử lý xong thì 0
  const cvCount = (status) => cvByStatus.find((item) => item.status === status).count;
  const finishedCvs = cvCount('COMPLETED') + cvCount('FAILED');
  const cvSuccessRate =
    finishedCvs === 0 ? 0 : Math.round((cvCount('COMPLETED') / finishedCvs) * 10000) / 10000;

  return {
    usersByRole: roles.map((role) => ({ role: role.name, count: usersByRoleId.get(role.id) || 0 })),
    lockedUsers,
    jobs: { total: totalJobs, open: openJobs },
    applications: {
      total: totalApplications,
      byStatus: countByEnum(applicationStatusGroups, 'status', Object.values(ApplicationStatus)),
    },
    newUsersByMonth: countByPeriod(newUserGroups, 'createdAt', monthKey, months.keys).map(
      ({ key, count }) => ({ month: key, count })
    ),
    cvByStatus,
    cvSuccessRate,
  };
}

module.exports = {
  listUsers,
  getUserDetail,
  createRecruiter,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  updateUserPassword,
  getDashboard,
};
