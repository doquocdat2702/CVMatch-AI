const candidateService = require('./candidate.service');
const { success } = require('../../utils/response');

// ?avatar=1 thì kèm ảnh đại diện (data URI hoặc null); không có tham số thì response không có trường avatar (T35k)
async function getMe(req, res, next) {
  try {
    const withAvatar = req.query.avatar === '1';
    const data = await candidateService.getMyProfile(req.user.userId, { withAvatar });
    return success(res, data, 'Lấy hồ sơ ứng viên thành công.');
  } catch (err) {
    return next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const data = await candidateService.updateMyProfile(req.user.userId, req.body || {});
    return success(res, data, 'Đã cập nhật hồ sơ.');
  } catch (err) {
    return next(err);
  }
}

// Ảnh đại diện (T35k): trả lại hồ sơ đầy đủ (kèm avatar data URI) để giao diện cập nhật ngay
async function uploadAvatar(req, res, next) {
  try {
    const data = await candidateService.setMyAvatar(req.user.userId, req.file);
    return success(res, data, 'Đã cập nhật ảnh đại diện.');
  } catch (err) {
    return next(err);
  }
}

async function deleteAvatar(req, res, next) {
  try {
    const data = await candidateService.deleteMyAvatar(req.user.userId);
    return success(res, data, 'Đã xóa ảnh đại diện.');
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await candidateService.getProfileById(req.params.id);
    return success(res, data, 'Lấy hồ sơ ứng viên thành công.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, updateMe, getById, uploadAvatar, deleteAvatar };
