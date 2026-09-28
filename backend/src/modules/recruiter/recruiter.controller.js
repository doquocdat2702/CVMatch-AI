const recruiterService = require('./recruiter.service');
const { success } = require('../../utils/response');

async function getMe(req, res, next) {
  try {
    const data = await recruiterService.getMyProfile(req.user.userId);
    return success(res, data, 'Lấy hồ sơ nhà tuyển dụng thành công');
  } catch (err) {
    return next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const data = await recruiterService.updateMyProfile(req.user.userId, req.body || {});
    return success(res, data, 'Cập nhật hồ sơ thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, updateMe };
