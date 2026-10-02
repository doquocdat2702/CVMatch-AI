// Gợi ý dựa HOÀN TOÀN trên matcher (T21), không có thuật toán xếp hạng riêng.
// Thứ tự chỉ là Requirement Coverage giảm dần, tức là tỉ lệ yêu cầu có bằng chứng rõ ràng.
// KHÔNG xếp hạng năng lực, KHÔNG dự đoán khả năng trúng tuyển,
// KHÔNG tự động loại ứng viên, KHÔNG gửi thông báo.
// Mỗi kết quả luôn kèm matrix có evidence và note, không bao giờ chỉ trả con số coverage.

const prisma = require('../../../config/prisma');
const { matchJobWithCandidate } = require('../matching/matcher');
const { COVERAGE_NOTE } = require('../matching/coverage');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const MESSAGE_NO_PROFILE_DATA =
  'Hồ sơ của bạn chưa có dữ liệu kỹ năng, kinh nghiệm hay học vấn. ' +
  'Hãy tải CV lên, trích xuất và phân tích CV để nhận gợi ý việc làm.';
const MESSAGE_JOB_NOT_PARSED = 'Job chưa được phân tích JD';

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

// limit sai hoặc không truyền -> 10, tối đa 50 để tránh chạy matcher quá nhiều lần
function parseLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(limit, MAX_LIMIT);
}

// Matrix rút gọn: chỉ requirement REQUIRED.
// Job không có requirement REQUIRED nào thì giữ cả matrix,
// để kết quả không bao giờ chỉ còn con số coverage mà thiếu evidence.
function shortenMatrix(matrix) {
  const required = matrix.filter((row) => row.type === 'REQUIRED');
  if (required.length > 0) {
    return { matrixScope: 'REQUIRED', matrix: required };
  }
  return { matrixScope: 'ALL', matrix };
}

// Bỏ phần job / candidate lặp lại, giữ nguyên số liệu coverage và note của matcher
function toItem(result) {
  return {
    coverage: result.coverage,
    supported: result.supported,
    uncertain: result.uncertain,
    notFound: result.notFound,
    total: result.total,
    note: result.note,
    ...shortenMatrix(result.matrix),
  };
}

// Coverage giảm dần; bằng nhau thì giữ thứ tự đầu vào (sort của JS là ổn định)
function byCoverageDesc(a, b) {
  return b.coverage - a.coverage;
}

// ===== Hàm 1: recommendJobsForCandidate =====

async function recommendJobsForCandidate(candidateProfileId, limit = DEFAULT_LIMIT) {
  const id = parseId(candidateProfileId, 'Mã ứng viên');
  const take = parseLimit(limit);

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      _count: { select: { skills: true, experiences: true, educations: true } },
    },
  });
  if (!candidate) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }

  const base = {
    candidate: { id: candidate.id, fullName: candidate.fullName },
    note: COVERAGE_NOTE,
  };

  const { skills, experiences, educations } = candidate._count;
  if (skills + experiences + educations === 0) {
    return { ...base, items: [], message: MESSAGE_NO_PROFILE_DATA };
  }

  // Job đang mở và đã có JobRequirement; mới đăng trước để thứ tự ổn định khi bằng coverage
  const jobs = await prisma.job.findMany({
    where: { isOpen: true, requirements: { some: {} } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  const items = [];
  for (const job of jobs) {
    const result = await matchJobWithCandidate(job.id, candidate.id);
    items.push({ job: result.job, ...toItem(result) });
  }

  items.sort(byCoverageDesc);

  return { ...base, items: items.slice(0, take) };
}

// ===== Hàm 2: recommendCandidatesForJob =====

async function recommendCandidatesForJob(jobId, limit = DEFAULT_LIMIT) {
  const id = parseId(jobId, 'Mã tin tuyển dụng');
  const take = parseLimit(limit);

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      company: { select: { name: true } },
      _count: { select: { requirements: true } },
    },
  });
  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng', 404);
  }

  const base = {
    job: { id: job.id, title: job.title, companyName: job.company ? job.company.name : null },
    note: COVERAGE_NOTE,
  };

  if (job._count.requirements === 0) {
    return { ...base, items: [], message: MESSAGE_JOB_NOT_PARSED };
  }

  // Chỉ xét ứng viên có ít nhất một CV status COMPLETED
  const candidates = await prisma.candidateProfile.findMany({
    where: { cvs: { some: { status: 'COMPLETED' } } },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  const items = [];
  for (const candidate of candidates) {
    const result = await matchJobWithCandidate(job.id, candidate.id);
    items.push({ candidate: result.candidate, ...toItem(result) });
  }

  items.sort(byCoverageDesc);

  return { ...base, items: items.slice(0, take) };
}

module.exports = { recommendJobsForCandidate, recommendCandidatesForJob };
