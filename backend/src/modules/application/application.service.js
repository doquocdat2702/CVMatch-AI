const prisma = require('../../config/prisma');
const { matchJobWithCandidate } = require('../ai/matching/matcher');
const { COVERAGE_NOTE } = require('../ai/matching/coverage');
const {
  NOTIFICATION_TYPES,
  buildNewApplicationMessage,
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

module.exports = { applyForJob, listMyApplications, withdrawApplication };
