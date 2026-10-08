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

  // Production: lỗi hệ thống không trả stack trace hay chi tiết nội bộ ra ngoài
  // (message lỗi Prisma có cả đường dẫn file và đoạn code). Lỗi 4xx vẫn giữ message.
  if (env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Lỗi hệ thống, vui lòng thử lại sau';
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
}

module.exports = errorMiddleware;
