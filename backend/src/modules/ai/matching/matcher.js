// Đối chiếu yêu cầu của một job với hồ sơ của một ứng viên (Requirement-Evidence Matching).
// Tính trực tiếp mỗi lần gọi, KHÔNG lưu bảng riêng.
// Chỉ đối chiếu và trích bằng chứng, KHÔNG chấm điểm năng lực, KHÔNG quyết định tuyển dụng.
//
// Ánh xạ status (CHỈ 3 giá trị của enum MatchStatus):
//   EXACT   -> SUPPORTED
//   PARTIAL -> UNCERTAIN
//   NONE    -> NOT_FOUND

const prisma = require('../../../config/prisma');
const { findEvidence, checkYearsRequirement } = require('./evidence.finder');
const { calculateCoverage } = require('./coverage');

const STATUS_BY_MATCH_TYPE = {
  EXACT: 'SUPPORTED',
  PARTIAL: 'UNCERTAIN',
  NONE: 'NOT_FOUND',
};

const MESSAGE_NOT_PARSED = 'Job chưa được phân tích JD';

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

function toStatus(matchType) {
  return STATUS_BY_MATCH_TYPE[matchType] || 'NOT_FOUND';
}

// Kết hợp bằng chứng kỹ năng/kinh nghiệm/học vấn với điều kiện số năm (nếu có).
// Requirement có minYears thì chỉ SUPPORTED khi kinh nghiệm liên quan ĐỦ số năm:
//   đủ năm                                   -> EXACT
//   có kinh nghiệm liên quan nhưng thiếu năm -> PARTIAL
//   không có kinh nghiệm liên quan nhưng có kỹ năng / học vấn -> PARTIAL
//   không có gì                              -> NONE
function resolveEvidence(requirement, profile) {
  const found = findEvidence(requirement, profile);
  const years = checkYearsRequirement(requirement, profile.experiences);

  if (!years) {
    return {
      matchType: found.matchType,
      evidence:
        found.matchType === 'NONE' ? null : { text: found.evidenceText, source: found.source },
    };
  }

  if (years.matchType !== 'NONE') {
    return {
      matchType: years.matchType,
      evidence: {
        text: years.evidenceText,
        source: years.source,
        totalYears: years.totalYears,
        minYears: years.minYears,
      },
    };
  }

  if (found.matchType !== 'NONE') {
    return {
      matchType: 'PARTIAL',
      evidence: {
        text: found.evidenceText,
        source: found.source,
        totalYears: 0,
        minYears: years.minYears,
      },
    };
  }

  return { matchType: 'NONE', evidence: null };
}

async function matchJobWithCandidate(jobId, candidateProfileId) {
  const jobKey = parseId(jobId, 'Mã tin tuyển dụng');
  const candidateKey = parseId(candidateProfileId, 'Mã ứng viên');

  const [job, candidate] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobKey },
      include: {
        company: { select: { name: true } },
        requirements: { orderBy: { id: 'asc' } },
      },
    }),
    prisma.candidateProfile.findUnique({
      where: { id: candidateKey },
      include: { skills: true, experiences: true, educations: true },
    }),
  ]);

  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng', 404);
  }
  if (!candidate) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }

  const matrix = job.requirements.map((requirement) => {
    const { matchType, evidence } = resolveEvidence(requirement, candidate);
    return {
      requirement: {
        id: requirement.id,
        rawText: requirement.rawText,
        normalizedName: requirement.normalizedName,
        skillId: requirement.skillId,
        minYears: requirement.minYears,
      },
      type: requirement.type,
      evidence,
      status: toStatus(matchType),
    };
  });

  const result = {
    job: { id: job.id, title: job.title, companyName: job.company ? job.company.name : null },
    candidate: { id: candidate.id, fullName: candidate.fullName },
    matrix,
    ...calculateCoverage(matrix),
  };

  if (matrix.length === 0) {
    result.message = MESSAGE_NOT_PARSED;
  }

  return result;
}

module.exports = { matchJobWithCandidate };
