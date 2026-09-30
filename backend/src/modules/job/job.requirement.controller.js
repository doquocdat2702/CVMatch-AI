const requirementService = require('./job.requirement.service');
const { success } = require('../../utils/response');

async function parseJd(req, res, next) {
  try {
    const data = await requirementService.parseJobDescription(req.user.userId, req.params.id);
    return success(res, data, `Phân tích JD thành công, trích xuất được ${data.length} yêu cầu`);
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await requirementService.listRequirements(req.params.id);
    return success(res, data, 'Lấy danh sách yêu cầu thành công');
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await requirementService.createRequirement(
      req.user.userId,
      req.params.id,
      req.body || {}
    );
    return success(res, data, 'Thêm yêu cầu thành công', 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await requirementService.updateRequirement(
      req.user.userId,
      req.params.id,
      req.params.reqId,
      req.body || {}
    );
    return success(res, data, 'Cập nhật yêu cầu thành công');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await requirementService.deleteRequirement(
      req.user.userId,
      req.params.id,
      req.params.reqId
    );
    return success(res, data, 'Xóa yêu cầu thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { parseJd, list, create, update, remove };
