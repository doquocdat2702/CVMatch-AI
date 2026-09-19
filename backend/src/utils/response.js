// Chuẩn hóa format response cho toàn bộ API: { success, message, data }

function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, message = 'Bad request', statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
}

module.exports = { success, error };
