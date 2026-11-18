const prisma = require('../../config/prisma');
const { normalizeText } = require('../ai/normalization/normalizer');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(`${label} không hợp lệ.`, 400);
  }
  return id;
}

// Hồ sơ nhà tuyển dụng đang đăng nhập, dùng để tự gán companyId / recruiterProfileId
async function getRecruiterProfile(userId) {
  const profile = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy thông tin nhà tuyển dụng.', 404);
  }
  if (!profile.companyId) {
    throw createError('Tài khoản chưa được gán vào công ty. Vui lòng liên hệ quản trị viên.', 404);
  }
  return profile;
}

// Lấy job và kiểm tra job có thuộc công ty của nhà tuyển dụng hay không
async function getOwnedJob(userId, jobId) {
  const id = parseId(jobId, 'Mã tin tuyển dụng');
  const profile = await getRecruiterProfile(userId);

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng.', 404);
  }
  if (job.companyId !== profile.companyId) {
    throw createError('Không có quyền thao tác trên tin tuyển dụng này.', 403);
  }

  return { job, profile };
}

// HR xem chung, sửa riêng: chỉ người đăng job (hoặc ADMIN) được thay đổi job
// và dữ liệu thuộc job (requirement, trạng thái đơn). user = req.user { userId, role }
async function assertCanManageJob(user, jobId) {
  const id = parseId(jobId, 'Mã tin tuyển dụng');

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng.', 404);
  }
  if (user.role === 'ADMIN') {
    return job;
  }

  const profile = await prisma.recruiterProfile.findUnique({ where: { userId: user.userId } });
  if (!profile || job.recruiterProfileId !== profile.id) {
    throw createError('Chỉ người đăng tin mới sửa được tin tuyển dụng này.', 403);
  }

  return job;
}

async function createJob(userId, { title, description, location }) {
  const profile = await getRecruiterProfile(userId);

  const jobTitle = typeof title === 'string' ? title.trim() : '';
  if (!jobTitle) {
    throw createError('Vui lòng nhập tiêu đề tin tuyển dụng.', 400);
  }

  const jd = typeof description === 'string' ? description.trim() : '';
  if (!jd) {
    throw createError('Vui lòng nhập mô tả công việc.', 400);
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

// ===== Kỹ năng của tin (T35j) =====

// Số kỹ năng mỗi tin trả về (thẻ tin hiện 4 + "+n", trang chi tiết hiện đủ) và số kỹ năng "Tìm nhanh"
const JOB_SKILL_LIMIT = 5;
const TOP_SKILL_LIMIT = 6;
// Từ khóa ngắn hơn thế chỉ khớp đúng tên / alias của Skill (như quy tắc khóa ngắn), không khớp một phần:
// "C" không được khớp mọi kỹ năng có chữ c
const SKILL_KEYWORD_MIN_CONTAINS = 3;
const TYPE_ORDER = { REQUIRED: 0, PREFERRED: 1, OPTIONAL: 2 };

// Tên Skill của nhiều tin trong MỘT truy vấn (không truy vấn theo từng tin): lấy từ JobRequirement có skillId,
// Bắt buộc trước rồi Ưu tiên, Không bắt buộc, cùng loại thì theo thứ tự yêu cầu; bỏ trùng, tối đa JOB_SKILL_LIMIT.
// Trả Map jobId -> [tên Skill]
async function loadJobSkills(jobIds) {
  const result = new Map(jobIds.map((id) => [id, []]));
  if (jobIds.length === 0) return result;

  const requirements = await prisma.jobRequirement.findMany({
    where: { jobId: { in: jobIds }, skillId: { not: null } },
    orderBy: { id: 'asc' },
    select: { jobId: true, type: true, skill: { select: { name: true } } },
  });
  requirements.sort((a, b) => (TYPE_ORDER[a.type] ?? 3) - (TYPE_ORDER[b.type] ?? 3));

  for (const requirement of requirements) {
    const names = result.get(requirement.jobId);
    if (names.length < JOB_SKILL_LIMIT && !names.includes(requirement.skill.name)) {
      names.push(requirement.skill.name);
    }
  }
  return result;
}

// Skill xuất hiện ở nhiều tin đang mở nhất (đếm mỗi tin một lần), bằng số tin thì theo tên
async function loadTopSkills() {
  const pairs = await prisma.jobRequirement.findMany({
    where: { skillId: { not: null }, job: { isOpen: true } },
    distinct: ['jobId', 'skillId'],
    select: { skill: { select: { name: true } } },
  });
  const counts = new Map();
  for (const pair of pairs) {
    counts.set(pair.skill.name, (counts.get(pair.skill.name) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_SKILL_LIMIT)
    .map(([name]) => name);
}

// Điều kiện "tin có yêu cầu gắn Skill khớp từ khóa". Alias lưu dạng không dấu, chữ thường, cách nhau bởi dấu phẩy
// nên so thêm từ khóa đã chuẩn hóa (normalizeText). Từ khóa >= 3 ký tự: khớp một phần tên / alias;
// ngắn hơn: chỉ khớp đúng tên hoặc đúng một alias trong danh sách
function skillKeywordCondition(keyword) {
  const forms = [...new Set([keyword, normalizeText(keyword)].filter(Boolean))];
  const conditions = [];
  for (const form of forms) {
    if (form.length >= SKILL_KEYWORD_MIN_CONTAINS) {
      conditions.push({ name: { contains: form } }, { aliases: { contains: form } });
    } else {
      conditions.push(
        { name: form },
        { aliases: form },
        { aliases: { startsWith: `${form},` } },
        { aliases: { endsWith: `,${form}` } },
        { aliases: { contains: `,${form},` } }
      );
    }
  }
  return { requirements: { some: { skill: { OR: conditions } } } };
}

// Danh sách công khai: chỉ job đang mở, phân trang + lọc keyword / location.
// keyword (T35j): khớp tiêu đề HOẶC tên / alias Skill trong yêu cầu của tin.
// Mỗi tin trả thêm skills (tên Skill chính); response trả thêm topSkills cho hàng "Tìm nhanh" của trang chủ
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
    const value = keyword.trim();
    where.OR = [{ title: { contains: value } }, skillKeywordCondition(value)];
  }
  if (typeof location === 'string' && location.trim()) {
    where.location = { contains: location.trim() };
  }

  const [total, jobs, topSkills] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: { company: { select: { id: true, name: true } } },
    }),
    loadTopSkills(),
  ]);

  const skillsByJob = await loadJobSkills(jobs.map((job) => job.id));
  const items = jobs.map((job) => ({ ...job, skills: skillsByJob.get(job.id) }));

  return {
    items,
    topSkills,
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
    throw createError('Không tìm thấy tin tuyển dụng.', 404);
  }

  // Kỹ năng chính của tin (T35j), cùng cách lấy với danh sách
  const skillsByJob = await loadJobSkills([job.id]);
  return { ...job, skills: skillsByJob.get(job.id) };
}

async function updateJob(user, jobId, { title, description, location }) {
  const job = await assertCanManageJob(user, jobId);
  const data = {};

  if (title !== undefined) {
    const value = typeof title === 'string' ? title.trim() : '';
    if (!value) {
      throw createError('Vui lòng nhập tiêu đề tin tuyển dụng.', 400);
    }
    data.title = value;
  }

  let requireReparse = false;
  if (description !== undefined) {
    const value = typeof description === 'string' ? description.trim() : '';
    if (!value) {
      throw createError('Vui lòng nhập mô tả công việc.', 400);
    }
    data.description = value;
    // JD đổi thì yêu cầu trích xuất lại JobRequirement
    requireReparse = value !== job.description;
  }

  if (location !== undefined) {
    data.location = typeof location === 'string' && location.trim() ? location.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    throw createError('Chưa có thay đổi nào để lưu.', 400);
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data,
    include: { company: { select: { id: true, name: true } } },
  });

  return { job: updated, requireReparse };
}

async function closeJob(user, jobId) {
  const job = await assertCanManageJob(user, jobId);

  return prisma.job.update({
    where: { id: job.id },
    data: { isOpen: false },
    include: { company: { select: { id: true, name: true } } },
  });
}

async function deleteJob(user, jobId) {
  const job = await assertCanManageJob(user, jobId);

  const applicationCount = await prisma.application.count({ where: { jobId: job.id } });
  if (applicationCount > 0) {
    throw createError(
      'Tin tuyển dụng đã có đơn ứng tuyển nên không thể xóa. Có thể đóng tin thay thế.',
      400
    );
  }

  await prisma.jobRequirement.deleteMany({ where: { jobId: job.id } });
  await prisma.job.delete({ where: { id: job.id } });

  return { id: job.id };
}

module.exports = {
  getOwnedJob,
  assertCanManageJob,
  createJob,
  listOpenJobs,
  listMyJobs,
  getJobById,
  updateJob,
  closeJob,
  deleteJob,
};
