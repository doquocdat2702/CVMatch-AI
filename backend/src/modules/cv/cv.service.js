const fs = require('fs');
const path = require('path');

const prisma = require('../../config/prisma');
const { extractText } = require('../ai/text-extraction');
const { parseCV } = require('../ai/cv-parser/hybrid.parser');
const {
  normalizeSkillName,
  resolveSkillId,
  loadSkillIndex,
} = require('../ai/normalization/normalizer');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Xóa file vật lý, bỏ qua nếu file không còn tồn tại
async function removeFile(filePath) {
  try {
    await fs.promises.unlink(path.resolve(process.cwd(), filePath));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[CV] Không xóa được file ${filePath}: ${err.message}`);
    }
  }
}

async function getCandidateProfile(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên', 404);
  }
  return profile;
}

async function createCv(userId, file, candidateProfileId) {
  if (!file) {
    throw createError('Chưa chọn file CV để tải lên', 400);
  }

  const profileId = candidateProfileId || (await getCandidateProfile(userId)).id;
  const fileType = path.extname(file.originalname).toLowerCase() === '.pdf' ? 'PDF' : 'DOCX';
  const relativePath = path.relative(process.cwd(), file.path).split(path.sep).join('/');

  try {
    return await prisma.cV.create({
      data: {
        candidateProfileId: profileId,
        fileName: file.originalname,
        filePath: relativePath,
        fileType,
        status: 'UPLOADED',
      },
    });
  } catch (err) {
    // Ghi DB thất bại thì không để lại file rác
    await removeFile(file.path);
    throw err;
  }
}

async function listMyCvs(userId) {
  const profile = await getCandidateProfile(userId);

  // Không trả rawText ở danh sách
  return prisma.cV.findMany({
    where: { candidateProfileId: profile.id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      candidateProfileId: true,
      fileName: true,
      filePath: true,
      fileType: true,
      status: true,
      errorMessage: true,
      uploadedAt: true,
      parsedAt: true,
    },
  });
}

// Lấy CV và kiểm tra quyền sở hữu
async function findOwnedCv(userId, cvId) {
  const id = Number(cvId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError('Mã CV không hợp lệ', 400);
  }

  const cv = await prisma.cV.findUnique({ where: { id } });
  if (!cv) {
    throw createError('Không tìm thấy CV', 404);
  }

  const profile = await getCandidateProfile(userId);
  if (cv.candidateProfileId !== profile.id) {
    throw createError('Bạn không có quyền truy cập CV này', 403);
  }

  return cv;
}

async function getCvDetail(userId, cvId) {
  return findOwnedCv(userId, cvId);
}

async function deleteCv(userId, cvId) {
  const cv = await findOwnedCv(userId, cvId);

  await prisma.cV.delete({ where: { id: cv.id } });
  await removeFile(cv.filePath);

  return { id: cv.id };
}

// Trích xuất text từ file CV và cập nhật trạng thái xử lý
async function extractCvText(userId, cvId) {
  const cv = await findOwnedCv(userId, cvId);

  if (cv.status === 'PROCESSING') {
    throw createError('CV đang được xử lý, vui lòng đợi', 400);
  }

  await prisma.cV.update({
    where: { id: cv.id },
    data: { status: 'PROCESSING', errorMessage: null },
  });

  const absolutePath = path.resolve(process.cwd(), cv.filePath);

  try {
    const rawText = await extractText(absolutePath, cv.fileType);

    return await prisma.cV.update({
      where: { id: cv.id },
      data: {
        rawText,
        status: 'COMPLETED',
        errorMessage: null,
        parsedAt: new Date(),
      },
    });
  } catch (err) {
    // Thất bại thì đánh dấu FAILED, giữ nguyên file vật lý
    await prisma.cV.update({
      where: { id: cv.id },
      data: {
        status: 'FAILED',
        errorMessage: err.message,
        parsedAt: null,
      },
    });
    throw err;
  }
}

// Các cột dưới DB đang là NOT NULL, NLP không bóc được thì lưu chuỗi rỗng
function textOrEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

// Bóc tách CV đã trích xuất text và ghi kết quả xuống database
async function parseCvToProfile(userId, cvId) {
  const cv = await findOwnedCv(userId, cvId);

  if (cv.status !== 'COMPLETED') {
    throw createError(
      'CV chưa trích xuất nội dung thành công, hãy gọi /extract trước khi bóc tách',
      400
    );
  }
  if (!cv.rawText || !cv.rawText.trim()) {
    throw createError('CV không có nội dung text để bóc tách', 400);
  }

  const profile = await getCandidateProfile(userId);

  // Gọi parser trước, xong mới mở transaction để không giữ kết nối DB trong lúc chờ LLM
  const parsed = await parseCV(cv.rawText);

  // NLP hỏng mà không bóc được gì thì giữ nguyên dữ liệu cũ, tránh xóa trắng hồ sơ
  const nothingParsed =
    parsed.skills.length === 0 &&
    parsed.experiences.length === 0 &&
    parsed.educations.length === 0;

  if (parsed.errors.nlp && nothingParsed) {
    throw createError(
      'Dịch vụ NLP đang không khả dụng, chưa bóc tách được CV. Dữ liệu cũ được giữ nguyên, vui lòng thử lại sau',
      503
    );
  }

  // Chuẩn hóa tên kỹ năng và tra skillId trước, nạp bảng Skill đúng một lần
  const skillIndex = await loadSkillIndex();
  const normalizedSkills = [];
  for (const skill of parsed.skills) {
    const { canonical, matched } = normalizeSkillName(skill.rawName);
    const skillId = await resolveSkillId(canonical, skillIndex);
    normalizedSkills.push({ ...skill, canonical, matchedDictionary: matched, skillId });
  }

  return prisma.$transaction(async (tx) => {
    // 1. Chỉ xóa bản ghi chưa được người dùng xác nhận
    const where = { candidateProfileId: profile.id, isConfirmed: false };
    await tx.candidateSkill.deleteMany({ where });
    await tx.candidateExperience.deleteMany({ where });
    await tx.candidateEducation.deleteMany({ where });

    // 2. Ghi bản ghi mới, luôn ở trạng thái chưa xác nhận
    for (const skill of normalizedSkills) {
      await tx.candidateSkill.create({
        data: {
          candidateProfileId: profile.id,
          // Luôn giữ tên gốc trong CV, skillId chỉ gán khi khớp từ điển và bảng Skill
          rawName: skill.rawName,
          skillId: skill.skillId,
          evidence: skill.evidence,
          source: skill.source,
          isConfirmed: false,
        },
      });
    }

    for (const experience of parsed.experiences) {
      await tx.candidateExperience.create({
        data: {
          candidateProfileId: profile.id,
          position: textOrEmpty(experience.position),
          companyName: textOrEmpty(experience.companyName),
          startDate: experience.startDate,
          endDate: experience.endDate,
          description: experience.description,
          evidence: experience.evidence,
          source: experience.source,
          isConfirmed: false,
        },
      });
    }

    for (const education of parsed.educations) {
      await tx.candidateEducation.create({
        data: {
          candidateProfileId: profile.id,
          school: textOrEmpty(education.school),
          major: textOrEmpty(education.major),
          degree: textOrEmpty(education.degree),
          startDate: education.startDate,
          endDate: education.endDate,
          source: education.source,
          isConfirmed: false,
        },
      });
    }

    // 3. Chỉ điền vào hồ sơ những trường đang trống, không ghi đè dữ liệu người dùng tự nhập
    const profileData = {};
    if (!profile.fullName && parsed.fullName) {
      profileData.fullName = parsed.fullName;
    }
    if (!profile.phone && parsed.phone) {
      profileData.phone = parsed.phone;
    }
    if (!profile.headline && parsed.headline) {
      profileData.headline = parsed.headline;
    }

    const updatedProfile =
      Object.keys(profileData).length > 0
        ? await tx.candidateProfile.update({ where: { id: profile.id }, data: profileData })
        : profile;

    const [skills, experiences, educations] = await Promise.all([
      tx.candidateSkill.findMany({
        where: { candidateProfileId: profile.id },
        include: { skill: true },
      }),
      tx.candidateExperience.findMany({ where: { candidateProfileId: profile.id } }),
      tx.candidateEducation.findMany({ where: { candidateProfileId: profile.id } }),
    ]);

    return {
      cvId: cv.id,
      profile: updatedProfile,
      contact: { email: parsed.email, phone: parsed.phone, urls: parsed.urls },
      totalYears: parsed.totalYears,
      skills,
      experiences,
      educations,
      parserErrors: parsed.errors,
    };
  });
}

module.exports = { createCv, listMyCvs, getCvDetail, deleteCv, extractCvText, parseCvToProfile };
