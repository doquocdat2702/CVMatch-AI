const prisma = require('../../config/prisma');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const PROFILE_INCLUDE = {
  skills: { include: { skill: true } },
  experiences: true,
  educations: true,
};

// Hồ sơ của chính ứng viên đang đăng nhập
async function getMyProfile(userId) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: PROFILE_INCLUDE,
  });

  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }

  return profile;
}

async function updateMyProfile(userId, { fullName, phone, address, headline }) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }

  const data = {};

  if (fullName !== undefined) {
    const value = typeof fullName === 'string' ? fullName.trim() : '';
    if (!value) {
      throw createError('Họ tên không được để trống', 400);
    }
    data.fullName = value;
  }
  if (phone !== undefined) {
    data.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  }
  if (address !== undefined) {
    data.address = typeof address === 'string' && address.trim() ? address.trim() : null;
  }
  if (headline !== undefined) {
    data.headline = typeof headline === 'string' && headline.trim() ? headline.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  return prisma.candidateProfile.update({
    where: { id: profile.id },
    data,
    include: PROFILE_INCLUDE,
  });
}

// Nhà tuyển dụng xem hồ sơ một ứng viên
async function getProfileById(candidateProfileId) {
  const id = Number(candidateProfileId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError('Mã hồ sơ ứng viên không hợp lệ', 400);
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { id },
    include: PROFILE_INCLUDE,
  });

  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }

  return profile;
}

module.exports = { getMyProfile, updateMyProfile, getProfileById };
