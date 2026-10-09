const requirementService = require('./job.requirement.service');
const { success } = require('../../utils/response');

async function parseJd(req, res, next) {
  try {
    const data = await requirementService.parseJobDescription(req.user, req.params.id);
    let message = `Phân tích JD thành công, trích xuất được ${data.requirements.length} yêu cầu`;
    if (data.mode === 'rule' && data.unresolvedCount > 0) {
      message += `, ${data.unresolvedCount} yêu cầu rule chưa phân loại được nên tạm để PREFERRED`;
    }
    return success(res, data, message);
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
      req.user,
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
      req.user,
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
      req.user,
      req.params.id,
      req.params.reqId
    );
    return success(res, data, 'Xóa yêu cầu thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { parseJd, list, create, update, remove };
