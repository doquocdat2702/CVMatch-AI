const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

// Đọc Authorization: Bearer <token>, verify và gán req.user = { userId, role }
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return error(res, 'Thiếu token xác thực', 401);
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return error(res, 'Định dạng token không hợp lệ, cần dạng: Bearer <token>', 401);
  }

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return error(res, 'Token đã hết hạn, vui lòng đăng nhập lại', 401);
    }
    return error(res, 'Token không hợp lệ', 401);
  }
}

module.exports = authenticate;
