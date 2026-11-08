const requirementService = require('./job.requirement.service');
const { success } = require('../../utils/response');

async function parseJd(req, res, next) {
  try {
    const data = await requirementService.parseJobDescription(req.user, req.params.id);
    let message = `Đã phân tích mô tả công việc, tìm được ${data.requirements.length} yêu cầu.`;
    if (data.mode === 'rule' && data.unresolvedCount > 0) {
      message += ` ${data.unresolvedCount} yêu cầu chưa phân loại chắc chắn, đang để Ưu tiên.`;
    }
    return success(res, data, message);
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await requirementService.listRequirements(req.params.id);
    return success(res, data, 'Lấy danh sách yêu cầu thành công.');
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await requirementService.createRequirement(
      req.user,
      req.params.id,
      req.body || {}
    );
    return success(res, data, 'Đã thêm yêu cầu.', 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await requirementService.updateRequirement(
      req.user,
      req.params.id,
      req.params.reqId,
      req.body || {}
    );
    return success(res, data, 'Đã cập nhật yêu cầu.');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await requirementService.deleteRequirement(
      req.user,
      req.params.id,
      req.params.reqId
    );
    return success(res, data, 'Đã xóa yêu cầu.');
  } catch (err) {
    return next(err);
  }
}

module.exports = { parseJd, list, create, update, remove };
