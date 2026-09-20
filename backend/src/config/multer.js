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

// Làm sạch tên file gốc: bỏ dấu cách và ký tự đặc biệt
function sanitizeFileName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, path.extname(originalName));

  const cleanBase = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80);

  return `${cleanBase || 'cv'}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    // Tên file: {candidateProfileId}-{timestamp}-{ten_goc_da_lam_sach}
    prisma.candidateProfile
      .findUnique({ where: { userId: req.user.userId } })
      .then((profile) => {
        if (!profile) {
          const err = new Error('Không tìm thấy hồ sơ ứng viên');
          err.statusCode = 404;
          return cb(err);
        }

        req.candidateProfileId = profile.id;
        return cb(null, `${profile.id}-${Date.now()}-${sanitizeFileName(file.originalname)}`);
      })
      .catch((err) => cb(err));
  },
});

module.exports = { storage, UPLOAD_PATH, sanitizeFileName };
