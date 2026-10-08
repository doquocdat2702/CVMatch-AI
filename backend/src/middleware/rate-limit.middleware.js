const { rateLimit } = require('express-rate-limit');
const { error } = require('../utils/response');

// Đăng nhập: tối đa 10 lần SAI mỗi 15 phút cho mỗi IP.
// Lần đăng nhập thành công (status < 400) không bị tính.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => error(res, 'Bạn thử quá nhiều lần, vui lòng thử lại sau 15 phút', 429),
});

// Quên mật khẩu: tối đa 5 lần mỗi 15 phút cho mỗi IP.
// Tính mọi request vì API luôn trả cùng một câu dù email có tồn tại hay không.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => error(res, 'Bạn thử quá nhiều lần, vui lòng thử lại sau 15 phút', 429),
});

module.exports = { loginLimiter, forgotPasswordLimiter };
