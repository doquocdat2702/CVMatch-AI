const applicationService = require('./application.service');
const { success } = require('../../utils/response');

async function apply(req, res, next) {
  try {
    const data = await applicationService.applyForJob(req.user.userId, req.body || {});
    const message =
      data.coverage === null
        ? 'Ứng tuyển thành công. Job chưa được phân tích JD nên chưa có coverage'
        : 'Ứng tuyển thành công';
    return success(res, data, message, 201);
  } catch (err) {
    return next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const data = await applicationService.listMyApplications(req.user.userId);
    return success(res, data, 'Lấy danh sách đơn ứng tuyển thành công');
  } catch (err) {
    return next(err);
  }
}

async function withdraw(req, res, next) {
  try {
    const data = await applicationService.withdrawApplication(req.user.userId, req.params.id);
    return success(res, data, 'Rút đơn ứng tuyển thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { apply, listMine, withdraw };
