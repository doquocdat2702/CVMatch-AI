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

module.exports = { register, login };
