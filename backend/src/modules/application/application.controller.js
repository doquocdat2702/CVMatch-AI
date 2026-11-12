const applicationService = require('./application.service');
const { success } = require('../../utils/response');

async function apply(req, res, next) {
  try {
    const data = await applicationService.applyForJob(req.user.userId, req.body || {});
    const message =
      data.coverage === null
        ? 'Đã gửi đơn ứng tuyển. Tin tuyển dụng chưa có yêu cầu để đối chiếu.'
        : 'Đã gửi đơn ứng tuyển.';
    return success(res, data, message, 201);
  } catch (err) {
    return next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const data = await applicationService.listMyApplications(req.user.userId);
    return success(res, data, 'Lấy danh sách đơn ứng tuyển thành công.');
  } catch (err) {
    return next(err);
  }
}

async function withdraw(req, res, next) {
  try {
    const data = await applicationService.withdrawApplication(req.user.userId, req.params.id);
    return success(res, data, 'Đã rút đơn ứng tuyển.');
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
    return success(res, data, 'Lấy danh sách đơn ứng tuyển của tin thành công.');
  } catch (err) {
    return next(err);
  }
}

// Nhà tuyển dụng: đơn của mọi tin mình đăng (T35i), ?status=&page=&limit=
async function listMyJobs(req, res, next) {
  try {
    const data = await applicationService.listMyJobsApplications(req.user.userId, req.query || {});
    return success(res, data, 'Lấy danh sách đơn ứng tuyển thành công.');
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
    return success(res, data, 'Đã cập nhật trạng thái đơn ứng tuyển.');
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

module.exports = { apply, listMine, withdraw, listByJob, listMyJobs, updateStatus, detail };
