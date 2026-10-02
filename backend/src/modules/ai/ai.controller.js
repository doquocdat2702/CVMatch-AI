const prisma = require('../../config/prisma');
const { matchJobWithCandidate } = require('./matching/matcher');
const { success } = require('../../utils/response');

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

// CANDIDATE chỉ xem được hồ sơ của chính mình,
// RECRUITER chỉ xem được job thuộc công ty mình
async function ensureCanViewMatching(user, jobId, candidateId) {
  if (user.role === 'CANDIDATE') {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.userId } });
    if (!profile || profile.id !== candidateId) {
      throw createError('Bạn chỉ được xem kết quả đối chiếu của chính mình', 403);
    }
    return;
  }

  if (user.role === 'RECRUITER') {
    const profile = await prisma.recruiterProfile.findUnique({ where: { userId: user.userId } });
    if (!profile) {
      throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
    }
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { companyId: true } });
    if (!job) {
      throw createError('Không tìm thấy tin tuyển dụng', 404);
    }
    if (job.companyId !== profile.companyId) {
      throw createError('Bạn không có quyền với tin tuyển dụng này', 403);
    }
    return;
  }

  throw createError('Bạn không có quyền truy cập', 403);
}

async function getMatching(req, res, next) {
  try {
    const jobId = parseId(req.params.jobId, 'Mã tin tuyển dụng');
    const candidateId = parseId(req.params.candidateId, 'Mã ứng viên');

    await ensureCanViewMatching(req.user, jobId, candidateId);

    const data = await matchJobWithCandidate(jobId, candidateId);
    return success(res, data, data.message || 'Đối chiếu yêu cầu thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMatching };
