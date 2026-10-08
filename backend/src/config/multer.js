const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const env = require('./env');
const prisma = require('./prisma');

const UPLOAD_PATH = path.resolve(process.cwd(), env.UPLOAD_DIR);

// Tự tạo thư mục lưu file nếu chưa có
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    // Tên file: {uuid}.{pdf|docx}, không dùng tên gốc do người dùng gửi lên.
    // fileFilter đã chạy trước nên đuôi chắc chắn là .pdf hoặc .docx
    prisma.candidateProfile
      .findUnique({ where: { userId: req.user.userId } })
      .then((profile) => {
        if (!profile) {
          const err = new Error('Không tìm thấy hồ sơ ứng viên');
          err.statusCode = 404;
          return cb(err);
        }

        req.candidateProfileId = profile.id;
        const ext = path.extname(file.originalname).toLowerCase();
        return cb(null, `${crypto.randomUUID()}${ext}`);
      })
      .catch((err) => cb(err));
  },
});

module.exports = { storage, UPLOAD_PATH };
