const jobService = require('./job.service');
const { success } = require('../../utils/response');

async function create(req, res, next) {
  try {
    const data = await jobService.createJob(req.user.userId, req.body || {});
    return success(res, data, 'Tạo tin tuyển dụng thành công', 201);
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await jobService.listOpenJobs(req.query || {});
    return success(res, data, 'Lấy danh sách tin tuyển dụng thành công');
  } catch (err) {
    return next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const data = await jobService.listMyJobs(req.user.userId);
    return success(res, data, 'Lấy danh sách tin tuyển dụng của bạn thành công');
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await jobService.getJobById(req.params.id);
    return success(res, data, 'Lấy chi tiết tin tuyển dụng thành công');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const { job, requireReparse } = await jobService.updateJob(
      req.user.userId,
      req.params.id,
      req.body || {}
    );
    return success(
      res,
      { ...job, requireReparse },
      requireReparse
        ? 'Cập nhật tin tuyển dụng thành công, JD đã thay đổi nên cần trích xuất lại yêu cầu'
        : 'Cập nhật tin tuyển dụng thành công'
    );
  } catch (err) {
    return next(err);
  }
}

async function close(req, res, next) {
  try {
    const data = await jobService.closeJob(req.user.userId, req.params.id);
    return success(res, data, 'Đóng tin tuyển dụng thành công');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await jobService.deleteJob(req.user.userId, req.params.id);
    return success(res, data, 'Xóa tin tuyển dụng thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, listMine, getById, update, close, remove };
