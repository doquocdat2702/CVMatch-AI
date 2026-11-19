const { rateLimit } = require('express-rate-limit');
const { error } = require('../utils/response');

// IP của request (QA-27): app.js KHÔNG bật `trust proxy`, nên mọi limiter theo IP dưới đây tính theo IP kết nối thật
// (req.ip = địa chỉ socket). Chạy trực tiếp (không qua proxy) thì KHÔNG được bật: bật lên, express tin header
// X-Forwarded-For do client tự gửi, kẻ tấn công đổi header mỗi lần là vượt mọi giới hạn theo IP.
// Khi triển khai sau Nginx hoặc proxy khác thì PHẢI bật đúng số tầng proxy, vd app.set('trust proxy', 1) cho một
// tầng Nginx; không bật thì mọi người dùng chung IP của proxy và chạm giới hạn của nhau. Không đặt `true`
// (tin mọi tầng, lại giả được header).

// Đăng nhập: tối đa 10 lần SAI mỗi 15 phút cho mỗi IP.
// Lần đăng nhập thành công (status < 400) không bị tính.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => error(res, 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.', 429),
});

// Quên mật khẩu: tối đa 5 lần mỗi 15 phút cho mỗi IP.
// Tính mọi request vì API luôn trả cùng một câu dù email có tồn tại hay không.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => error(res, 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.', 429),
});

// Đăng ký (QA-25): tối đa 30 lần mỗi giờ cho mỗi IP, tính MỌI request (kể cả lần báo "Email này đã được dùng"),
// để không dò hàng loạt email đã đăng ký và không tạo tài khoản rác hàng loạt.
// Mức 30 đủ cho bộ smoke (mỗi lần chạy đăng ký vài tài khoản từ cùng một IP; server test khởi động lại thì đếm lại)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => error(res, 'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ.', 429),
});

// Tải ảnh đại diện (QA-36): tối đa 10 lần tải THÀNH CÔNG mỗi 15 phút cho mỗi TÀI KHOẢN (đặt sau authenticate).
// Lần bị từ chối (sai loại, quá 1 MB) không ghi đĩa nên không tính
const avatarUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipFailedRequests: true,
  keyGenerator: (req) => `user-${req.user.userId}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => error(res, 'Bạn đã đổi ảnh đại diện quá nhiều lần. Vui lòng thử lại sau 15 phút.', 429),
});

module.exports = { loginLimiter, forgotPasswordLimiter, registerLimiter, avatarUploadLimiter };
