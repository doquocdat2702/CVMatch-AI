const prisma = require('../../config/prisma');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Công ty mà nhà tuyển dụng đang thuộc về
async function getMyCompany(userId) {
  const profile = await prisma.recruiterProfile.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!profile) {
    throw createError('Không tìm thấy hồ sơ nhà tuyển dụng', 404);
  }
  if (!profile.company) {
    throw createError('Tài khoản chưa được gán công ty', 404);
  }

  return profile.company;
}

// Nhà tuyển dụng chỉ sửa được công ty mình thuộc về
async function updateMyCompany(userId, { name, description, address, website }) {
  const company = await getMyCompany(userId);
  const data = {};

  if (name !== undefined) {
    const value = typeof name === 'string' ? name.trim() : '';
    if (!value) {
      throw createError('Tên công ty không được để trống', 400);
    }
    data.name = value;
  }
  if (description !== undefined) {
    data.description =
      typeof description === 'string' && description.trim() ? description.trim() : null;
  }
  if (address !== undefined) {
    data.address = typeof address === 'string' && address.trim() ? address.trim() : null;
  }
  if (website !== undefined) {
    data.website = typeof website === 'string' && website.trim() ? website.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  return prisma.company.update({ where: { id: company.id }, data });
}

// Xem công khai, không cần đăng nhập
async function getCompanyById(companyId) {
  const id = Number(companyId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError('Mã công ty không hợp lệ', 400);
  }

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    throw createError('Không tìm thấy công ty', 404);
  }

  return company;
}

module.exports = { getMyCompany, updateMyCompany, getCompanyById };
