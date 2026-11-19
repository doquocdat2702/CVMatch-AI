const env = require('../config/env');

const GENERIC_MESSAGE = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';

// Lỗi do dữ liệu người dùng gửi lên mà thư viện báo ra (không phải code tự đặt statusCode).
// Đổi sang câu tiếng Việt và mã 4xx để không thành 500 và không lộ message gốc của thư viện (QA-02, QA-09)
function mapLibraryError(err) {
  // Prisma P2000: chuỗi dài hơn độ dài cột VarChar
  if (err.code === 'P2000') {
    return { statusCode: 400, message: 'Nội dung nhập quá dài. Vui lòng rút gọn rồi thử lại.' };
  }
  // express.json(): body không phải JSON hợp lệ / quá lớn
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Dữ liệu gửi lên không đúng định dạng. Vui lòng thử lại.' };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Dữ liệu gửi lên quá lớn. Vui lòng rút gọn rồi thử lại.' };
  }
  return null;
}

// Middleware bắt lỗi tập trung, đặt ở cuối chuỗi middleware của app
function errorMiddleware(err, req, res, next) {
  const mapped = mapLibraryError(err);
  const statusCode = mapped ? mapped.statusCode : err.statusCode || err.status || 500;

  // Log đầy đủ (kèm stack) ở phía server, kể cả lỗi đã đổi câu
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Lỗi do code tự định nghĩa (createError đặt statusCode): message là câu tiếng Việt, giữ nguyên.
  // Lỗi 5xx không xác định (lỗi bất ngờ, lỗi Prisma có đường dẫn file và đoạn code): KHÔNG trả message gốc
  // ở BẤT KỲ chế độ nào (QA-02). Production ẩn cả message của lỗi 500 tự định nghĩa (quyết định 4.3),
  // vẫn giữ message của 400 / 403 / 404 / 429 / 503
  const isDefinedError = Number.isInteger(err.statusCode);
  let message;
  if (mapped) {
    message = mapped.message;
  } else if (statusCode >= 500 && (!isDefinedError || (statusCode === 500 && env.NODE_ENV === 'production'))) {
    message = GENERIC_MESSAGE;
  } else {
    message = err.message || GENERIC_MESSAGE;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
}

module.exports = errorMiddleware;
