// Ứng viên tự thêm / sửa / xóa dữ liệu mà hệ thống phân tích ra.
// Mọi thao tác chỉ áp dụng trên hồ sơ của chính người đang đăng nhập.
const prisma = require('../../config/prisma');
const { normalizeSkillName, resolveSkillId } = require('../ai/normalization/normalizer');

const SOURCE_MANUAL = 'MANUAL';

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function getMyProfile(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }
  return profile;
}

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(`Mã ${label} không hợp lệ`, 400);
  }
  return id;
}

// Lấy bản ghi và kiểm tra quyền sở hữu
async function findOwnedItem(model, userId, itemId, label) {
  const id = parseId(itemId, label);
  const item = await prisma[model].findUnique({ where: { id } });

  if (!item) {
    throw createError(`Không tìm thấy ${label}`, 404);
  }

  const profile = await getMyProfile(userId);
  if (item.candidateProfileId !== profile.id) {
    throw createError(`Bạn không có quyền truy cập ${label} này`, 403);
  }

  return { item, profile };
}

function requiredText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw createError(`${label} không được để trống`, 400);
  }
  return text;
}

function optionalText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

// Chấp nhận "YYYY-MM-DD", "YYYY-MM", "YYYY"; sai định dạng thì báo lỗi rõ ràng
function parseDate(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (Number.isNaN(date.getTime())) {
      throw createError(`${label} không hợp lệ`, 400);
    }
    return date;
  }

  match = text.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  }

  match = text.match(/^(\d{4})$/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), 0, 1));
  }

  throw createError(`${label} phải theo định dạng YYYY-MM-DD, YYYY-MM hoặc YYYY`, 400);
}

function ensureDateOrder(startDate, endDate) {
  if (startDate && endDate && startDate > endDate) {
    throw createError('Ngày bắt đầu không được lớn hơn ngày kết thúc', 400);
  }
}

// ===== SKILL =====

async function createSkill(userId, body) {
  const profile = await getMyProfile(userId);
  const rawName = requiredText(body.rawName, 'Tên kỹ năng');

  const { canonical } = normalizeSkillName(rawName);
  const skillId = await resolveSkillId(canonical);

  return prisma.candidateSkill.create({
    data: {
      candidateProfileId: profile.id,
      rawName,
      skillId,
      evidence: optionalText(body.evidence),
      source: SOURCE_MANUAL,
      isConfirmed: true,
    },
    include: { skill: true },
  });
}

async function updateSkill(userId, skillItemId, body) {
  const { item } = await findOwnedItem('candidateSkill', userId, skillItemId, 'kỹ năng');
  const data = {};

  if (body.rawName !== undefined) {
    const rawName = requiredText(body.rawName, 'Tên kỹ năng');
    data.rawName = rawName;
    // Đổi tên thì chuẩn hóa lại và gán lại skillId
    const { canonical } = normalizeSkillName(rawName);
    data.skillId = await resolveSkillId(canonical);
  }
  if (body.evidence !== undefined) {
    data.evidence = optionalText(body.evidence);
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  // Người dùng đã sửa thì coi như đã xác nhận
  data.isConfirmed = true;

  return prisma.candidateSkill.update({
    where: { id: item.id },
    data,
    include: { skill: true },
  });
}

async function deleteSkill(userId, skillItemId) {
  const { item } = await findOwnedItem('candidateSkill', userId, skillItemId, 'kỹ năng');
  await prisma.candidateSkill.delete({ where: { id: item.id } });
  return { id: item.id };
}

// ===== EXPERIENCE =====

async function createExperience(userId, body) {
  const profile = await getMyProfile(userId);

  const position = requiredText(body.position, 'Vị trí công việc');
  const companyName = requiredText(body.companyName, 'Tên công ty');
  const startDate = parseDate(body.startDate, 'Ngày bắt đầu');
  const endDate = parseDate(body.endDate, 'Ngày kết thúc');
  ensureDateOrder(startDate, endDate);

  return prisma.candidateExperience.create({
    data: {
      candidateProfileId: profile.id,
      position,
      companyName,
      startDate,
      endDate,
      description: optionalText(body.description),
      evidence: optionalText(body.evidence),
      source: SOURCE_MANUAL,
      isConfirmed: true,
    },
  });
}

async function updateExperience(userId, experienceId, body) {
  const { item } = await findOwnedItem('candidateExperience', userId, experienceId, 'kinh nghiệm');
  const data = {};

  if (body.position !== undefined) {
    data.position = requiredText(body.position, 'Vị trí công việc');
  }
  if (body.companyName !== undefined) {
    data.companyName = requiredText(body.companyName, 'Tên công ty');
  }
  if (body.startDate !== undefined) {
    data.startDate = parseDate(body.startDate, 'Ngày bắt đầu');
  }
  if (body.endDate !== undefined) {
    data.endDate = parseDate(body.endDate, 'Ngày kết thúc');
  }
  if (body.description !== undefined) {
    data.description = optionalText(body.description);
  }
  if (body.evidence !== undefined) {
    data.evidence = optionalText(body.evidence);
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  // So sánh với giá trị đang có nếu request chỉ gửi một trong hai mốc thời gian
  const startDate = data.startDate !== undefined ? data.startDate : item.startDate;
  const endDate = data.endDate !== undefined ? data.endDate : item.endDate;
  ensureDateOrder(startDate, endDate);

  data.isConfirmed = true;

  return prisma.candidateExperience.update({ where: { id: item.id }, data });
}

async function deleteExperience(userId, experienceId) {
  const { item } = await findOwnedItem('candidateExperience', userId, experienceId, 'kinh nghiệm');
  await prisma.candidateExperience.delete({ where: { id: item.id } });
  return { id: item.id };
}

// ===== EDUCATION =====

async function createEducation(userId, body) {
  const profile = await getMyProfile(userId);

  const school = requiredText(body.school, 'Tên trường');
  const startDate = parseDate(body.startDate, 'Ngày bắt đầu');
  const endDate = parseDate(body.endDate, 'Ngày kết thúc');
  ensureDateOrder(startDate, endDate);

  return prisma.candidateEducation.create({
    data: {
      candidateProfileId: profile.id,
      school,
      // Cột đang NOT NULL, không nhập thì lưu chuỗi rỗng
      major: optionalText(body.major) || '',
      degree: optionalText(body.degree) || '',
      startDate,
      endDate,
      source: SOURCE_MANUAL,
      isConfirmed: true,
    },
  });
}

async function updateEducation(userId, educationId, body) {
  const { item } = await findOwnedItem('candidateEducation', userId, educationId, 'học vấn');
  const data = {};

  if (body.school !== undefined) {
    data.school = requiredText(body.school, 'Tên trường');
  }
  if (body.major !== undefined) {
    data.major = optionalText(body.major) || '';
  }
  if (body.degree !== undefined) {
    data.degree = optionalText(body.degree) || '';
  }
  if (body.startDate !== undefined) {
    data.startDate = parseDate(body.startDate, 'Ngày bắt đầu');
  }
  if (body.endDate !== undefined) {
    data.endDate = parseDate(body.endDate, 'Ngày kết thúc');
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  const startDate = data.startDate !== undefined ? data.startDate : item.startDate;
  const endDate = data.endDate !== undefined ? data.endDate : item.endDate;
  ensureDateOrder(startDate, endDate);

  data.isConfirmed = true;

  return prisma.candidateEducation.update({ where: { id: item.id }, data });
}

async function deleteEducation(userId, educationId) {
  const { item } = await findOwnedItem('candidateEducation', userId, educationId, 'học vấn');
  await prisma.candidateEducation.delete({ where: { id: item.id } });
  return { id: item.id };
}

module.exports = {
  createSkill,
  updateSkill,
  deleteSkill,
  createExperience,
  updateExperience,
  deleteExperience,
  createEducation,
  updateEducation,
  deleteEducation,
};
