const env = require('../config/env');

// Middleware bắt lỗi tập trung, đặt ở cuối chuỗi middleware của app
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Log đầy đủ (kèm stack) ở phía server
  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Production: chỉ ẩn message của lỗi 500 không xác định (lỗi bất ngờ, lỗi Prisma có cả đường dẫn
  // file và đoạn code). Lỗi đã định nghĩa (có statusCode do code tự đặt: 400, 403, 404, 503...)
  // giữ nguyên message để người dùng biết chuyện gì xảy ra.
  const isDefinedError = Number.isInteger(err.statusCode || err.status) && statusCode !== 500;
  if (env.NODE_ENV === 'production' && statusCode >= 500 && !isDefinedError) {
    message = 'Lỗi hệ thống, vui lòng thử lại sau';
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
}

module.exports = errorMiddleware;
