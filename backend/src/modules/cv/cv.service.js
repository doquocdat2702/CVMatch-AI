const fs = require('fs');
const path = require('path');

const prisma = require('../../config/prisma');
const { extractText } = require('../ai/text-extraction');

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

module.exports = { createCv, listMyCvs, getCvDetail, deleteCv, extractCvText };
