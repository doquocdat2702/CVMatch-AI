const adminService = require('./admin.service');
const { success } = require('../../utils/response');

async function listUsers(req, res, next) {
  try {
    const data = await adminService.listUsers(req.query || {});
    return success(res, data, 'Lấy danh sách tài khoản thành công');
  } catch (err) {
    return next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const data = await adminService.getUserDetail(req.params.id);
    return success(res, data, 'Lấy chi tiết tài khoản thành công');
  } catch (err) {
    return next(err);
  }
}

async function createRecruiter(req, res, next) {
  try {
    const data = await adminService.createRecruiter(req.body || {});
    return success(res, data, 'Tạo tài khoản nhà tuyển dụng thành công', 201);
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await adminService.updateUserStatus(req.user.userId, req.params.id, req.body || {});
    return success(res, data, data.isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
  } catch (err) {
    return next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const data = await adminService.updateUserRole(req.user.userId, req.params.id, req.body || {});
    return success(res, data, 'Đổi role thành công');
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const data = await adminService.deleteUser(req.user.userId, req.params.id);
    return success(res, data, 'Xóa tài khoản thành công');
  } catch (err) {
    return next(err);
  }
}

async function updatePassword(req, res, next) {
  try {
    const data = await adminService.updateUserPassword(req.user.userId, req.params.id, req.body || {});
    return success(res, data, 'Đặt lại mật khẩu thành công');
  } catch (err) {
    return next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    const data = await adminService.getDashboard();
    return success(res, data, 'Lấy số liệu tổng quan thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  dashboard,
  listUsers,
  getUser,
  createRecruiter,
  updateStatus,
  updateRole,
  deleteUser,
  updatePassword,
};
