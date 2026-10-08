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

async function listByJob(req, res, next) {
  try {
    const data = await applicationService.listApplicationsForJob(
      req.user.userId,
      req.params.jobId,
      req.query || {}
    );
    return success(res, data, 'Lấy danh sách đơn ứng tuyển của job thành công');
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await applicationService.updateApplicationStatus(
      req.user,
      req.params.id,
      req.body || {}
    );
    return success(res, data, 'Cập nhật trạng thái đơn ứng tuyển thành công');
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await applicationService.getApplicationDetail(req.user, req.params.id);
    return success(res, data, data.message || 'Lấy chi tiết đơn ứng tuyển thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { apply, listMine, withdraw, listByJob, updateStatus, detail };
