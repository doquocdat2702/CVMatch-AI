const prisma = require('../../config/prisma');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getMyProfile(userId) {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
  }

  return profile;
}

// Chỉ cho sửa thông tin cá nhân, companyId do Admin gán khi tạo tài khoản
async function updateMyProfile(userId, { fullName, phone, position }) {
  const profile = await prisma.recruiterProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
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
  if (position !== undefined) {
    data.position = typeof position === 'string' && position.trim() ? position.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  return prisma.recruiterProfile.update({
    where: { id: profile.id },
    data,
    include: { company: true },
  });
}

module.exports = { getMyProfile, updateMyProfile };
