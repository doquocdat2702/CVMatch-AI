const candidateService = require('./candidate.service');
const { success } = require('../../utils/response');

async function getMe(req, res, next) {
  try {
    const data = await candidateService.getMyProfile(req.user.userId);
    return success(res, data, 'Lấy hồ sơ ứng viên thành công');
  } catch (err) {
    return next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const data = await candidateService.updateMyProfile(req.user.userId, req.body || {});
    return success(res, data, 'Cập nhật hồ sơ thành công');
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await candidateService.getProfileById(req.params.id);
    return success(res, data, 'Lấy hồ sơ ứng viên thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, updateMe, getById };
