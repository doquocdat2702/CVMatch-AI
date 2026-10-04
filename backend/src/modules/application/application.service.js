const prisma = require('../../config/prisma');
const { matchJobWithCandidate } = require('../ai/matching/matcher');
const { COVERAGE_NOTE } = require('../ai/matching/coverage');
const { getOwnedJob } = require('../job/job.service');
const {
  NOTIFICATION_TYPES,
  APPLICATION_STATUS_LABELS,
  buildNewApplicationMessage,
  buildStatusChangedMessage,
  createNotification,
} = require('../notification/notification.service');

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

async function getCandidateProfile(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }
  return profile;
}

const JOB_SUMMARY_SELECT = {
  id: true,
  title: true,
  company: { select: { name: true } },
};

// Dạng trả về chung cho một đơn: job title, tên công ty, appliedAt, status, coverage lúc nộp
function toApplicationView(application, job) {
  return {
    id: application.id,
    status: application.status,
    coverage: application.coverage,
    appliedAt: application.appliedAt,
    job: {
      id: job.id,
      title: job.title,
      companyName: job.company ? job.company.name : null,
    },
  };
}

// ===== Ứng tuyển =====

async function applyForJob(userId, { jobId } = {}) {
  const id = parseId(jobId, 'Mã tin tuyển dụng');
  const profile = await getCandidateProfile(userId);

  // 1. Job tồn tại và đang mở
  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      ...JOB_SUMMARY_SELECT,
      isOpen: true,
      recruiterProfile: { select: { userId: true } },
    },
  });
  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng', 404);
  }
  if (!job.isOpen) {
    throw createError('Vị trí đã đóng', 400);
  }

  // 2. Có ít nhất một CV đã xử lý xong
  const completedCvCount = await prisma.cV.count({
    where: { candidateProfileId: profile.id, status: 'COMPLETED' },
  });
  if (completedCvCount === 0) {
    throw createError('Bạn cần upload và phân tích CV trước khi ứng tuyển', 400);
  }

  // 3. Chưa từng ứng tuyển job này
  const existing = await prisma.application.findUnique({
    where: { candidateProfileId_jobId: { candidateProfileId: profile.id, jobId: job.id } },
  });
  if (existing) {
    throw createError('Bạn đã ứng tuyển vị trí này', 400);
  }

  // Chạy matcher ngay lúc nộp và lưu coverage để giữ nguyên giá trị tại thời điểm này.
  // Job chưa có requirement thì không có gì để đối chiếu -> lưu null thay vì 0.
  const match = await matchJobWithCandidate(job.id, profile.id);
  const coverage = match.total > 0 ? match.coverage : null;

  let application;
  try {
    application = await prisma.application.create({
      data: {
        candidateProfileId: profile.id,
        jobId: job.id,
        status: 'APPLIED',
        coverage,
      },
    });
  } catch (err) {
    // Hai request nộp cùng lúc: request sau vướng unique (candidateProfileId, jobId)
    if (err.code === 'P2002') {
      throw createError('Bạn đã ứng tuyển vị trí này', 400);
    }
    throw err;
  }

  // Thông báo cho recruiter sở hữu job; lỗi chỉ ghi log, không làm hỏng việc nộp đơn
  await createNotification({
    userId: job.recruiterProfile.userId,
    type: NOTIFICATION_TYPES.NEW_APPLICATION,
    message: buildNewApplicationMessage({ candidateName: profile.fullName, jobTitle: job.title }),
    applicationId: application.id,
  });

  return { ...toApplicationView(application, job), note: COVERAGE_NOTE };
}

// ===== Đơn của tôi =====

async function listMyApplications(userId) {
  const profile = await getCandidateProfile(userId);

  const applications = await prisma.application.findMany({
    where: { candidateProfileId: profile.id },
    orderBy: [{ appliedAt: 'desc' }, { id: 'desc' }],
    include: { job: { select: JOB_SUMMARY_SELECT } },
  });

  return {
    items: applications.map((application) => toApplicationView(application, application.job)),
    note: COVERAGE_NOTE,
  };
}

// ===== Rút đơn =====

async function withdrawApplication(userId, applicationId) {
  const id = parseId(applicationId, 'Mã đơn ứng tuyển');
  const profile = await getCandidateProfile(userId);

  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    throw createError('Không tìm thấy đơn ứng tuyển', 404);
  }
  if (application.candidateProfileId !== profile.id) {
    throw createError('Bạn không có quyền với đơn ứng tuyển này', 403);
  }
  if (application.status !== 'APPLIED') {
    throw createError('Không thể rút đơn khi nhà tuyển dụng đã xem xét', 400);
  }

  // Điều kiện status nằm ngay trong lệnh xóa: nếu recruiter vừa đổi trạng thái
  // giữa lúc đọc và lúc xóa thì không xóa nhầm
  const result = await prisma.application.deleteMany({ where: { id, status: 'APPLIED' } });
  if (result.count === 0) {
    throw createError('Không thể rút đơn khi nhà tuyển dụng đã xem xét', 400);
  }

  return { id };
}

// ===== Phía recruiter =====

const APPLICATION_STATUSES = ['APPLIED', 'REVIEWING', 'ACCEPTED', 'REJECTED'];

// Luồng hợp lệ: APPLIED -> REVIEWING -> ACCEPTED | REJECTED, và APPLIED -> REJECTED.
// ACCEPTED, REJECTED là trạng thái cuối, không đổi tiếp.
const STATUS_TRANSITIONS = {
  APPLIED: ['REVIEWING', 'REJECTED'],
  REVIEWING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
};

function parseStatus(value) {
  const status = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!APPLICATION_STATUSES.includes(status)) {
    throw createError(`Trạng thái phải là một trong: ${APPLICATION_STATUSES.join(', ')}`, 400);
  }
  return status;
}

function statusLabel(status) {
  return APPLICATION_STATUS_LABELS[status] || status;
}

async function getRecruiterProfile(userId) {
  const profile = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
  }
  return profile;
}

// Recruiter chỉ thao tác trên đơn nộp vào job thuộc công ty mình
async function getApplicationForRecruiter(userId, applicationId) {
  const id = parseId(applicationId, 'Mã đơn ứng tuyển');
  const profile = await getRecruiterProfile(userId);

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      job: { select: { id: true, title: true, companyId: true } },
      candidateProfile: { select: { id: true, userId: true, fullName: true } },
    },
  });
  if (!application) {
    throw createError('Không tìm thấy đơn ứng tuyển', 404);
  }
  if (application.job.companyId !== profile.companyId) {
    throw createError('Bạn không có quyền với đơn ứng tuyển này', 403);
  }

  return application;
}

// Đơn của một job: lọc theo status, coverage lúc nộp giảm dần
async function listApplicationsForJob(userId, jobId, { status } = {}) {
  const { job } = await getOwnedJob(userId, jobId);

  const where = { jobId: job.id };
  if (status !== undefined && status !== '') {
    where.status = parseStatus(status);
  }

  const applications = await prisma.application.findMany({
    where,
    // MySQL xếp NULL cuối khi sắp DESC: đơn nộp lúc job chưa phân tích JD nằm cuối danh sách.
    // Bằng coverage thì đơn nộp trước đứng trước.
    orderBy: [{ coverage: 'desc' }, { appliedAt: 'asc' }, { id: 'asc' }],
    include: { candidateProfile: { select: { id: true, fullName: true } } },
  });

  return {
    job: { id: job.id, title: job.title },
    items: applications.map((application) => ({
      id: application.id,
      status: application.status,
      coverage: application.coverage,
      appliedAt: application.appliedAt,
      candidate: {
        id: application.candidateProfile.id,
        fullName: application.candidateProfile.fullName,
      },
    })),
    note: COVERAGE_NOTE,
  };
}

async function updateApplicationStatus(userId, applicationId, { status } = {}) {
  const application = await getApplicationForRecruiter(userId, applicationId);
  const nextStatus = parseStatus(status);
  const currentStatus = application.status;

  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  if (allowed.length === 0) {
    throw createError(`Đơn đã ở trạng thái ${statusLabel(currentStatus)}, không thể đổi tiếp`, 400);
  }
  if (nextStatus === currentStatus) {
    throw createError(`Đơn đang ở trạng thái ${statusLabel(currentStatus)}`, 400);
  }
  if (!allowed.includes(nextStatus)) {
    throw createError(
      `Không thể chuyển đơn từ ${statusLabel(currentStatus)} sang ${statusLabel(nextStatus)}`,
      400
    );
  }

  // Chỉ cập nhật khi trạng thái vẫn đúng như lúc đọc: hai người đổi cùng lúc
  // hoặc ứng viên vừa rút đơn thì không ghi đè
  const result = await prisma.application.updateMany({
    where: { id: application.id, status: currentStatus },
    data: { status: nextStatus },
  });
  if (result.count === 0) {
    throw createError('Trạng thái đơn vừa được thay đổi, vui lòng tải lại', 400);
  }

  // Thông báo cho ứng viên; lỗi chỉ ghi log, không làm hỏng việc đổi trạng thái
  await createNotification({
    userId: application.candidateProfile.userId,
    type: NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED,
    message: buildStatusChangedMessage({ jobTitle: application.job.title, status: nextStatus }),
    applicationId: application.id,
  });

  return {
    id: application.id,
    previousStatus: currentStatus,
    status: nextStatus,
    job: { id: application.job.id, title: application.job.title },
    candidate: {
      id: application.candidateProfile.id,
      fullName: application.candidateProfile.fullName,
    },
  };
}

// ===== Chi tiết đơn =====

// Candidate chỉ xem đơn của mình, recruiter chỉ xem đơn vào job công ty mình
async function getApplicationDetail(user, applicationId) {
  const id = parseId(applicationId, 'Mã đơn ứng tuyển');

  const application = await prisma.application.findUnique({
    where: { id },
    include: { job: { select: { companyId: true } } },
  });
  if (!application) {
    throw createError('Không tìm thấy đơn ứng tuyển', 404);
  }

  if (user.role === 'CANDIDATE') {
    const profile = await getCandidateProfile(user.userId);
    if (application.candidateProfileId !== profile.id) {
      throw createError('Bạn chỉ được xem đơn ứng tuyển của chính mình', 403);
    }
  } else if (user.role === 'RECRUITER') {
    const profile = await getRecruiterProfile(user.userId);
    if (application.job.companyId !== profile.companyId) {
      throw createError('Bạn không có quyền với đơn ứng tuyển này', 403);
    }
  } else {
    throw createError('Bạn không có quyền truy cập', 403);
  }

  // Ma trận tính LẠI từ dữ liệu hiện tại; coverageAtApply là giá trị đã lưu lúc nộp
  const match = await matchJobWithCandidate(application.jobId, application.candidateProfileId);

  return {
    id: application.id,
    status: application.status,
    appliedAt: application.appliedAt,
    updatedAt: application.updatedAt,
    job: match.job,
    candidate: match.candidate,
    coverageAtApply: application.coverage,
    coverage: match.coverage,
    supported: match.supported,
    uncertain: match.uncertain,
    notFound: match.notFound,
    total: match.total,
    matrix: match.matrix,
    note: match.note,
    ...(match.message ? { message: match.message } : {}),
  };
}

module.exports = {
  applyForJob,
  listMyApplications,
  withdrawApplication,
  listApplicationsForJob,
  updateApplicationStatus,
  getApplicationDetail,
};
