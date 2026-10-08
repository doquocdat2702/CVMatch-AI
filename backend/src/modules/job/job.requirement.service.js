const prisma = require('../../config/prisma');
const { assertCanManageJob } = require('./job.service');
const { extractRequirements } = require('../ai/jd-parser/requirement.extractor');
const { classifyBatch, REQUIREMENT_TYPES } = require('../ai/jd-parser/requirement.classifier');
const {
  normalizeSkillName,
  resolveSkillId,
  loadSkillIndex,
} = require('../ai/normalization/normalizer');

const MAX_NAME_LENGTH = 255;
const MAX_MIN_YEARS = 50;

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

// ===== Validate =====

function requiredText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw createError(`${label} không được để trống`, 400);
  }
  return text;
}

function parseType(value) {
  const type = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!REQUIREMENT_TYPES.includes(type)) {
    throw createError(`Loại yêu cầu phải là một trong: ${REQUIREMENT_TYPES.join(', ')}`, 400);
  }
  return type;
}

// minYears không bắt buộc: null / rỗng -> null, còn lại phải là số nguyên 0..50
function parseMinYears(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const years = Number(value);
  if (!Number.isInteger(years) || years < 0 || years > MAX_MIN_YEARS) {
    throw createError(`Số năm kinh nghiệm phải là số nguyên từ 0 đến ${MAX_MIN_YEARS}`, 400);
  }
  return years;
}

// Chuẩn hóa tên theo từ điển rồi tra skillId, giống luồng kỹ năng của CV
async function normalizeName(rawName, skillIndex) {
  const { canonical } = normalizeSkillName(rawName);
  const normalizedName = canonical.slice(0, MAX_NAME_LENGTH);
  const skillId = await resolveSkillId(normalizedName, skillIndex);
  return { normalizedName, skillId };
}

async function findJobOrThrow(jobId) {
  const id = parseId(jobId, 'Mã tin tuyển dụng');
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) {
    throw createError('Không tìm thấy tin tuyển dụng', 404);
  }
  return job;
}

// Requirement phải thuộc đúng job trên URL, không thì coi như không tồn tại
async function findRequirementOfJob(jobId, reqId) {
  const id = parseId(reqId, 'Mã yêu cầu');
  const requirement = await prisma.jobRequirement.findUnique({ where: { id } });
  if (!requirement || requirement.jobId !== jobId) {
    throw createError('Không tìm thấy yêu cầu trong tin tuyển dụng này', 404);
  }
  return requirement;
}

const REQUIREMENT_INCLUDE = { skill: { select: { id: true, name: true } } };

// ===== Phần A: phân tích JD =====

// JD -> extractRequirements -> classifyBatch -> chuẩn hóa -> ghi đè toàn bộ JobRequirement
async function parseJobDescription(user, jobId) {
  const job = await assertCanManageJob(user, jobId);

  const description = typeof job.description === 'string' ? job.description.trim() : '';
  if (!description) {
    throw createError('Job chưa có mô tả để phân tích', 400);
  }

  const extracted = extractRequirements(description);
  // classifyBatch không throw: LLM lỗi thì mục chưa quyết được mặc định OPTIONAL
  const types = await classifyBatch(extracted);

  // Nạp bảng Skill đúng một lần cho cả danh sách
  const skillIndex = await loadSkillIndex();
  const rows = [];
  for (let i = 0; i < extracted.length; i += 1) {
    const item = extracted[i];
    const { normalizedName, skillId } = await normalizeName(item.candidateName, skillIndex);
    if (!normalizedName) {
      continue;
    }
    rows.push({
      jobId: job.id,
      rawText: item.rawText,
      normalizedName,
      skillId,
      type: REQUIREMENT_TYPES.includes(types[i]) ? types[i] : 'OPTIONAL',
      minYears: item.minYears,
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.jobRequirement.deleteMany({ where: { jobId: job.id } });

    for (const data of rows) {
      await tx.jobRequirement.create({ data });
    }

    return tx.jobRequirement.findMany({
      where: { jobId: job.id },
      orderBy: { id: 'asc' },
      include: REQUIREMENT_INCLUDE,
    });
  });
}

// ===== Phần B: quản lý requirement =====

// Công khai
async function listRequirements(jobId) {
  const job = await findJobOrThrow(jobId);

  return prisma.jobRequirement.findMany({
    where: { jobId: job.id },
    orderBy: { id: 'asc' },
    include: REQUIREMENT_INCLUDE,
  });
}

async function createRequirement(user, jobId, body) {
  const job = await assertCanManageJob(user, jobId);

  const rawText = requiredText(body.rawText, 'Câu yêu cầu gốc');
  const name = requiredText(body.normalizedName, 'Tên yêu cầu');
  const type = parseType(body.type);
  const minYears = parseMinYears(body.minYears);

  const { normalizedName, skillId } = await normalizeName(name);

  return prisma.jobRequirement.create({
    data: { jobId: job.id, rawText, normalizedName, skillId, type, minYears },
    include: REQUIREMENT_INCLUDE,
  });
}

// Chỉ cho sửa normalizedName, type, minYears; rawText là câu gốc trong JD nên giữ nguyên
async function updateRequirement(user, jobId, reqId, body) {
  const job = await assertCanManageJob(user, jobId);
  const requirement = await findRequirementOfJob(job.id, reqId);
  const data = {};

  if (body.normalizedName !== undefined) {
    const name = requiredText(body.normalizedName, 'Tên yêu cầu');
    const { normalizedName, skillId } = await normalizeName(name);
    data.normalizedName = normalizedName;
    // Tên đổi thì tra lại skillId
    if (normalizedName !== requirement.normalizedName) {
      data.skillId = skillId;
    }
  }
  if (body.type !== undefined) {
    data.type = parseType(body.type);
  }
  if (body.minYears !== undefined) {
    data.minYears = parseMinYears(body.minYears);
  }

  if (Object.keys(data).length === 0) {
    throw createError('Không có thông tin nào để cập nhật', 400);
  }

  return prisma.jobRequirement.update({
    where: { id: requirement.id },
    data,
    include: REQUIREMENT_INCLUDE,
  });
}

async function deleteRequirement(user, jobId, reqId) {
  const job = await assertCanManageJob(user, jobId);
  const requirement = await findRequirementOfJob(job.id, reqId);

  await prisma.jobRequirement.delete({ where: { id: requirement.id } });

  return { id: requirement.id };
}

module.exports = {
  parseJobDescription,
  listRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
};
