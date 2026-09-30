const prisma = require('../../config/prisma');

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

// Hồ sơ nhà tuyển dụng đang đăng nhập, dùng để tự gán companyId / recruiterProfileId
async function getRecruiterProfile(userId) {
  const profile = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
  }
  if (!profile.companyId) {
    throw createError('Tài khoản chưa được gán công ty', 404);
  }
  return profile;
}

// Lấy job và kiểm tra job có thuộc công ty của nhà tuyển dụng hay không
async function getOwnedJob(userId, jobId) {
  const id = parseId(jobId, 'Mã tin tuyển dụng');
  const profile = await getRecruiterProfile(userId);

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng', 404);
  }
  if (job.companyId !== profile.companyId) {
    throw createError('Bạn không có quyền với tin tuyển dụng này', 403);
  }

  return { job, profile };
}

async function createJob(userId, { title, description, location }) {
  const profile = await getRecruiterProfile(userId);

  const jobTitle = typeof title === 'string' ? title.trim() : '';
  if (!jobTitle) {
    throw createError('Tiêu đề tin tuyển dụng không được để trống', 400);
  }

  const jd = typeof description === 'string' ? description.trim() : '';
  if (!jd) {
    throw createError('Mô tả công việc (JD) không được để trống', 400);
  }

  return prisma.job.create({
    data: {
      title: jobTitle,
      description: jd,
      location: typeof location === 'string' && location.trim() ? location.trim() : null,
      companyId: profile.companyId,
      recruiterProfileId: profile.id,
    },
    include: { company: { select: { id: true, name: true } } },
  });
}

// Danh sách công khai: chỉ job đang mở, phân trang + lọc keyword / location
async function listOpenJobs({ page, limit, keyword, location } = {}) {
  let currentPage = Number(page);
  if (!Number.isInteger(currentPage) || currentPage <= 0) {
    currentPage = 1;
  }

  let pageSize = Number(limit);
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    pageSize = 10;
  }

  const where = { isOpen: true };

  if (typeof keyword === 'string' && keyword.trim()) {
    where.title = { contains: keyword.trim() };
  }
  if (typeof location === 'string' && location.trim()) {
    where.location = { contains: location.trim() };
  }

  const [total, items] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: { company: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    },
  };
}

// Job của nhà tuyển dụng, gồm cả job đã đóng, kèm số đơn ứng tuyển
async function listMyJobs(userId) {
  const profile = await getRecruiterProfile(userId);

  const jobs = await prisma.job.findMany({
    where: { recruiterProfileId: profile.id },
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { id: true, name: true } },
      _count: { select: { applications: true } },
    },
  });

  return jobs.map(({ _count, ...job }) => ({
    ...job,
    applicationCount: _count.applications,
  }));
}

async function getJobById(jobId) {
  const id = parseId(jobId, 'Mã tin tuyển dụng');

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: true,
      requirements: true,
    },
  });

  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng', 404);
  }

  return job;
}

async function updateJob(userId, jobId, { title, description, location }) {
  const { job } = await getOwnedJob(userId, jobId);
  const data = {};

  if (title !== undefined) {
    const value = typeof title === 'string' ? title.trim() : '';
    if (!value) {
      throw createError('Tiêu đề tin tuyển dụng không được để trống', 400);
    }
    data.title = value;
  }

  let requireReparse = false;
  if (description !== undefined) {
    const value = typeof description === 'string' ? description.trim() : '';
    if (!value) {
      throw createError('Mô tả công việc (JD) không được để trống', 400);
    }
    data.description = value;
    // JD đổi thì yêu cầu trích xuất lại JobRequirement
    requireReparse = value !== job.description;
  }

  if (location !== undefined) {
    data.location = typeof location === 'string' && location.trim() ? location.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data,
    include: { company: { select: { id: true, name: true } } },
  });

  return { job: updated, requireReparse };
}

async function closeJob(userId, jobId) {
  const { job } = await getOwnedJob(userId, jobId);

  return prisma.job.update({
    where: { id: job.id },
    data: { isOpen: false },
    include: { company: { select: { id: true, name: true } } },
  });
}

async function deleteJob(userId, jobId) {
  const { job } = await getOwnedJob(userId, jobId);

  const applicationCount = await prisma.application.count({ where: { jobId: job.id } });
  if (applicationCount > 0) {
    throw createError(
      'Tin tuyển dụng đã có đơn ứng tuyển, hãy đóng tin thay vì xóa',
      400
    );
  }

  await prisma.jobRequirement.deleteMany({ where: { jobId: job.id } });
  await prisma.job.delete({ where: { id: job.id } });

  return { id: job.id };
}

module.exports = {
  getOwnedJob,
  createJob,
  listOpenJobs,
  listMyJobs,
  getJobById,
  updateJob,
  closeJob,
  deleteJob,
};
