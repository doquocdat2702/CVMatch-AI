const authService = require('./auth.service');
const { success } = require('../../utils/response');

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body || {});
    return success(res, data, 'Đã tạo tài khoản.', 201);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body || {});
    return success(res, data, 'Đã đăng nhập.');
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const data = await authService.getMe(req.user.userId);
    return success(res, data, 'Lấy thông tin tài khoản thành công.');
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const data = await authService.changePassword(req.user.userId, req.body || {});
    return success(res, data, 'Đã đổi mật khẩu.');
  } catch (err) {
    return next(err);
  }
}

// Hệ thống không lưu token phía server, client tự xóa token khi đăng xuất
async function logout(req, res) {
  return success(res, null, 'Đã đăng xuất.');
}

// Luôn trả cùng một câu, không để lộ email nào có tài khoản
async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(req.body || {});
    return success(res, null, 'Nếu email đã đăng ký tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi tới email đó.');
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const data = await authService.resetPassword(req.body || {});
    return success(res, data, 'Đã đặt lại mật khẩu.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, me, changePassword, logout, forgotPassword, resetPassword };
