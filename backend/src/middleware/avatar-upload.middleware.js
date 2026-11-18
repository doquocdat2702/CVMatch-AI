const multer = require('multer');
const { error } = require('../utils/response');

// Ảnh đại diện ứng viên (T35k): tối đa 1 MB, một file ở field "avatar".
// Giữ trong bộ nhớ (không ghi đĩa) cho tới khi service kiểm magic bytes xong: file sai định dạng không bao giờ chạm đĩa.
// Không lọc theo đuôi file hay Content-Type trình duyệt gửi (người dùng tự khai được); chỉ tin byte đầu của file.
const MAX_AVATAR_SIZE = 1 * 1024 * 1024;
const MESSAGE_TOO_LARGE = 'Ảnh vượt quá 1 MB. Vui lòng chọn ảnh nhỏ hơn.';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
  // Trình duyệt gửi tên file dạng UTF-8 (như upload CV); tên gốc không được lưu, chỉ để log
  defParamCharset: 'utf8',
});

function uploadAvatar(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, MESSAGE_TOO_LARGE, 400);
      }
      return error(res, 'Không nhận được ảnh. Vui lòng chọn lại ảnh.', 400);
    }
    return next(err);
  });
}

module.exports = { uploadAvatar, MAX_AVATAR_SIZE };
