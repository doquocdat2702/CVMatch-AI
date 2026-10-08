const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { storage } = require('../config/multer');
const { error } = require('../utils/response');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Byte đầu của file: PDF bắt đầu "%PDF", DOCX (thực chất là file zip) bắt đầu "PK".
// Đuôi file và mimetype do client tự khai nên không đủ tin cậy.
const FILE_SIGNATURES = { '.pdf': '%PDF', '.docx': 'PK' };

async function hasValidSignature(file) {
  const signature = FILE_SIGNATURES[path.extname(file.filename).toLowerCase()];
  if (!signature) {
    return false;
  }

  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(signature.length);
    const { bytesRead } = await handle.read(buffer, 0, signature.length, 0);
    return bytesRead === signature.length && buffer.toString('latin1') === signature;
  } finally {
    await handle.close();
  }
}

// Kiểm tra file vừa lưu, sai định dạng thì xóa ngay
async function verifyUploadedFile(req, res, next) {
  if (!req.file) {
    return next();
  }

  let isValid;
  try {
    isValid = await hasValidSignature(req.file);
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return next(err);
  }

  if (!isValid) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return error(res, 'File không đúng định dạng PDF hoặc DOCX', 400);
  }

  return next();
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
  const isValidMime = ALLOWED_MIMETYPES.includes(file.mimetype);

  // Kiểm tra cả đuôi file lẫn mimetype
  if (!isValidExt || !isValidMime) {
    const err = new Error('Chỉ chấp nhận file PDF hoặc DOCX');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err);
  }

  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Nhận đúng 1 file ở field "file", dịch lỗi của multer sang format chuẩn,
// rồi kiểm tra byte đầu của file đã lưu
function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      return verifyUploadedFile(req, res, next);
    }

    if (err.code === 'INVALID_FILE_TYPE') {
      return error(res, 'Chỉ chấp nhận file PDF hoặc DOCX', 400);
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, 'File vượt quá 5MB', 400);
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return error(res, 'Sai tên field, hãy dùng field "file"', 400);
      }
      return error(res, `Tải file thất bại: ${err.message}`, 400);
    }

    return next(err);
  });
}

module.exports = uploadSingleFile;
