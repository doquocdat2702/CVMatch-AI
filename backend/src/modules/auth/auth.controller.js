const authService = require('./auth.service');
const { success } = require('../../utils/response');

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body || {});
    return success(res, data, 'Đăng ký thành công', 201);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body || {});
    return success(res, data, 'Đăng nhập thành công');
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const data = await authService.getMe(req.user.userId);
    return success(res, data, 'Lấy thông tin tài khoản thành công');
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const data = await authService.changePassword(req.user.userId, req.body || {});
    return success(res, data, 'Đổi mật khẩu thành công');
  } catch (err) {
    return next(err);
  }
}

// Hệ thống không lưu token phía server, client tự xóa token khi đăng xuất
async function logout(req, res) {
  return success(res, null, 'Đăng xuất thành công');
}

module.exports = { register, login, me, changePassword, logout };
