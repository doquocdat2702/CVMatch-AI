const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

// Đọc Authorization: Bearer <token>, verify rồi đọc lại User trong DB,
// gán req.user = { userId, role } với role lấy từ DB.
// Nhờ vậy khóa tài khoản hoặc đổi role có hiệu lực ngay, không chờ token hết hạn.
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return error(res, 'Thiếu token xác thực', 401);
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return error(res, 'Định dạng token không hợp lệ, cần dạng: Bearer <token>', 401);
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return error(res, 'Token đã hết hạn, vui lòng đăng nhập lại', 401);
    }
    return error(res, 'Token không hợp lệ', 401);
  }

  if (!Number.isInteger(payload.userId)) {
    return error(res, 'Token không hợp lệ', 401);
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });
  } catch (err) {
    return next(err);
  }

  if (!user) {
    return error(res, 'Tài khoản không còn tồn tại', 401);
  }
  if (!user.isActive) {
    return error(res, 'Tài khoản đã bị khóa', 403);
  }

  req.user = { userId: user.id, role: user.role.name };
  return next();
}

module.exports = authenticate;
