// Middleware bắt lỗi tập trung, đặt ở cuối chuỗi middleware của app
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
}

module.exports = errorMiddleware;
