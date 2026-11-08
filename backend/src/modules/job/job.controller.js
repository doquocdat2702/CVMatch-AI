const jobService = require('./job.service');
const { success } = require('../../utils/response');

async function create(req, res, next) {
  try {
    const data = await jobService.createJob(req.user.userId, req.body || {});
    return success(res, data, 'Đã tạo tin tuyển dụng.', 201);
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
      req.user,
      req.params.id,
      req.body || {}
    );
    return success(
      res,
      { ...job, requireReparse },
      requireReparse
        ? 'Đã lưu tin tuyển dụng. Mô tả công việc đã thay đổi, vui lòng phân tích lại yêu cầu.'
        : 'Đã lưu tin tuyển dụng.'
    );
  } catch (err) {
    return next(err);
  }
}

async function close(req, res, next) {
  try {
    const data = await jobService.closeJob(req.user, req.params.id);
    return success(res, data, 'Đã đóng tin tuyển dụng.');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await jobService.deleteJob(req.user, req.params.id);
    return success(res, data, 'Đã xóa tin tuyển dụng.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, listMine, getById, update, close, remove };
