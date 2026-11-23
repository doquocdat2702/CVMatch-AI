const { MAX_DB_ID } = require('../../utils/ids');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../../config/prisma');
const { UPLOAD_PATH } = require('../../config/multer');
const { parseWebLink } = require('../../utils/webLink');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Liên kết GitHub / LinkedIn (T35m): ứng viên tự nhập, chỉ trả cho chính ứng viên. HR / Admin không nhận
// (giống ảnh đại diện T35k): bỏ cùng avatarPath ở getProfileById và admin.service (getUserDetail)
const LINK_FIELDS = {
  githubUrl: { label: 'Liên kết GitHub', example: 'https://github.com/tentaikhoan' },
  linkedinUrl: { label: 'Liên kết LinkedIn', example: 'https://www.linkedin.com/in/tentaikhoan' },
};
const HIDDEN_FROM_STAFF = { avatarPath: true, githubUrl: true, linkedinUrl: true };

const PROFILE_INCLUDE = {
  skills: { include: { skill: true } },
  experiences: true,
  educations: true,
};

// ===== Ảnh đại diện (T35k) =====
// Lưu ở thư mục con riêng dưới UPLOAD_DIR, tên file UUID; thư mục upload không phục vụ dạng file tĩnh.
// Ảnh chỉ trả cho chính ứng viên, nhúng sẵn dạng data URI trong GET /candidates/me
// (thẻ img không gửi kèm token được, và bản in CV cần ảnh nằm sẵn trong trang)
const AVATAR_DIR = path.join(UPLOAD_PATH, 'avatars');
const MESSAGE_NOT_IMAGE = 'Chỉ nhận ảnh JPEG hoặc PNG.';

// Chỉ tin byte đầu của file: JPEG FF D8 FF, PNG 89 50 4E 47 0D 0A 1A 0A. SVG, GIF, WEBP và mọi loại khác bị từ chối
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= png.length && png.every((byte, i) => buffer[i] === byte)) {
    return { ext: 'png', mime: 'image/png' };
  }
  return null;
}

// Đường dẫn tuyệt đối của ảnh nếu nằm trong thư mục ảnh đại diện, không thì null (avatarPath lạ coi như không có ảnh)
function resolveAvatarPath(avatarPath) {
  if (!avatarPath) return null;
  const absolutePath = path.resolve(process.cwd(), String(avatarPath));
  return absolutePath.startsWith(AVATAR_DIR + path.sep) ? absolutePath : null;
}

// Xóa file ảnh trên đĩa, bỏ qua nếu file không còn. Dùng cả khi admin xóa tài khoản ứng viên
async function removeAvatarFile(avatarPath) {
  const absolutePath = resolveAvatarPath(avatarPath);
  if (!absolutePath) return;
  try {
    await fs.promises.unlink(absolutePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[AVATAR] Không xóa được file ${avatarPath}: ${err.message}`);
    }
  }
}

// Data URI base64 của ảnh, mất file thì null (giao diện về vòng tròn chữ cái đầu)
async function readAvatarDataUri(avatarPath) {
  const absolutePath = resolveAvatarPath(avatarPath);
  if (!absolutePath) return null;
  try {
    const buffer = await fs.promises.readFile(absolutePath);
    const type = detectImageType(buffer);
    return type ? `data:${type.mime};base64,${buffer.toString('base64')}` : null;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`[AVATAR] Không đọc được file ${avatarPath}: ${err.message}`);
    }
    return null;
  }
}

// Hồ sơ trả cho chính ứng viên: luôn bỏ đường dẫn file trên máy chủ. withAvatar thì thêm avatar (data URI hoặc null),
// không thì response không có trường avatar (base64 nặng ~1,33 lần ảnh, chỉ vài màn hình cần)
async function toOwnProfile(profile, { withAvatar = true } = {}) {
  const { avatarPath, ...rest } = profile;
  if (!withAvatar) return rest;
  return { ...rest, avatar: await readAvatarDataUri(avatarPath) };
}

async function findProfileOrThrow(userId) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên.', 404);
  }
  return profile;
}

// Hồ sơ của chính ứng viên đang đăng nhập. Mặc định không kèm ảnh; GET /candidates/me?avatar=1 và 2 endpoint ảnh
// mới kèm (withAvatar: true)
async function getMyProfile(userId, { withAvatar = false } = {}) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: PROFILE_INCLUDE,
  });

  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên.', 404);
  }

  return toOwnProfile(profile, { withAvatar });
}

// Đổi avatarPath của hồ sơ sang nextPath (null = bỏ ảnh), trả đường dẫn ảnh VỪA BỊ THAY để xóa file cũ.
// Ghi có điều kiện "avatarPath vẫn là giá trị vừa đọc": hai lần tải / xóa cùng lúc thì lần sau thấy 0 dòng,
// đọc lại rồi thay đúng ảnh của lần trước. Mỗi lần chỉ xóa đúng file mình đã thay, không file nào thành mồ côi
// (QA-36). Thử lại tối đa vài lần, quá thì báo lỗi (lần gọi này không thay được ảnh)
const AVATAR_SWAP_ATTEMPTS = 5;
async function swapAvatarPath(profileId, nextPath) {
  for (let attempt = 0; attempt < AVATAR_SWAP_ATTEMPTS; attempt += 1) {
    const current = await prisma.candidateProfile.findUnique({
      where: { id: profileId },
      select: { avatarPath: true },
    });
    if (!current) {
      throw createError('Không tìm thấy hồ sơ ứng viên.', 404);
    }
    const { count } = await prisma.candidateProfile.updateMany({
      where: { id: profileId, avatarPath: current.avatarPath },
      data: { avatarPath: nextPath },
    });
    if (count === 1) return current.avatarPath;
  }
  throw createError('Ảnh đại diện đang được cập nhật ở nơi khác. Vui lòng thử lại.', 409);
}

// file: req.file của multer (bộ nhớ, đã giới hạn 1 MB). Ghi file mới xong mới cập nhật DB, rồi mới xóa ảnh cũ
async function setMyAvatar(userId, file) {
  if (!file) {
    throw createError('Vui lòng chọn ảnh để tải lên.', 400);
  }
  const type = detectImageType(file.buffer);
  if (!type) {
    throw createError(MESSAGE_NOT_IMAGE, 400);
  }

  const profile = await findProfileOrThrow(userId);
  await fs.promises.mkdir(AVATAR_DIR, { recursive: true });
  const absolutePath = path.join(AVATAR_DIR, `${crypto.randomUUID()}.${type.ext}`);
  await fs.promises.writeFile(absolutePath, file.buffer, { flag: 'wx' });
  const relativePath = path.relative(process.cwd(), absolutePath).split(path.sep).join('/');

  let replacedPath;
  try {
    replacedPath = await swapAvatarPath(profile.id, relativePath);
  } catch (err) {
    // Ghi DB thất bại thì không để lại file rác
    await removeAvatarFile(relativePath);
    throw err;
  }
  if (replacedPath && replacedPath !== relativePath) {
    await removeAvatarFile(replacedPath);
  }

  return getMyProfile(userId, { withAvatar: true });
}

// Xóa ảnh: đặt avatarPath = null rồi xóa file. Chưa có ảnh thì vẫn trả hồ sơ (gọi lại không lỗi)
async function deleteMyAvatar(userId) {
  const profile = await findProfileOrThrow(userId);
  if (profile.avatarPath) {
    const replacedPath = await swapAvatarPath(profile.id, null);
    if (replacedPath) {
      await removeAvatarFile(replacedPath);
    }
  }
  return getMyProfile(userId, { withAvatar: true });
}

// ===== Mục tiêu nghề nghiệp (T35k) =====
const OBJECTIVE_MAX_LENGTH = 1000;

// Cắt khoảng trắng thừa: gộp dấu cách liên tiếp, bỏ khoảng trắng đầu / cuối dòng, tối đa một dòng trống giữa hai đoạn
function cleanObjective(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function updateMyProfile(userId, { fullName, phone, address, headline, objective, githubUrl, linkedinUrl }) {
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên.', 404);
  }

  const data = {};

  if (fullName !== undefined) {
    const value = typeof fullName === 'string' ? fullName.trim() : '';
    if (!value) {
      throw createError('Vui lòng nhập họ và tên.', 400);
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
  if (objective !== undefined) {
    const value = cleanObjective(objective);
    if (value.length > OBJECTIVE_MAX_LENGTH) {
      throw createError(`Mục tiêu nghề nghiệp tối đa ${OBJECTIVE_MAX_LENGTH} ký tự.`, 400);
    }
    data.objective = value || null;
  }
  // Liên kết (T35m): cắt khoảng trắng, rỗng -> null, chỉ http(s), tối đa 255 ký tự (utils/webLink.js)
  const links = { githubUrl, linkedinUrl };
  for (const [name, config] of Object.entries(LINK_FIELDS)) {
    if (links[name] !== undefined) {
      data[name] = parseWebLink(links[name], config);
    }
  }

  if (Object.keys(data).length === 0) {
    throw createError('Chưa có thay đổi nào để lưu.', 400);
  }

  const updated = await prisma.candidateProfile.update({
    where: { id: profile.id },
    data,
    include: PROFILE_INCLUDE,
  });
  // Không kèm ảnh: giao diện không dùng ảnh trong phản hồi lưu hồ sơ (ảnh tải lại qua GET ?avatar=1)
  return toOwnProfile(updated, { withAvatar: false });
}

// Nhà tuyển dụng xem hồ sơ một ứng viên
async function getProfileById(candidateProfileId) {
  const id = Number(candidateProfileId);
  if (!Number.isInteger(id) || id <= 0 || id > MAX_DB_ID) {
    throw createError('Mã hồ sơ ứng viên không hợp lệ.', 400);
  }

  // Ảnh đại diện (T35k) và liên kết GitHub / LinkedIn (T35m) không trả cho nhà tuyển dụng
  const profile = await prisma.candidateProfile.findUnique({
    where: { id },
    omit: HIDDEN_FROM_STAFF,
    include: PROFILE_INCLUDE,
  });

  if (!profile) {
    throw createError('Không tìm thấy hồ sơ ứng viên.', 404);
  }

  return profile;
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getProfileById,
  setMyAvatar,
  deleteMyAvatar,
  removeAvatarFile,
  detectImageType,
  OBJECTIVE_MAX_LENGTH,
  HIDDEN_FROM_STAFF,
};
