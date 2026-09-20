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

// Nhận đúng 1 file ở field "file", dịch lỗi của multer sang format chuẩn
function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      return next();
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
