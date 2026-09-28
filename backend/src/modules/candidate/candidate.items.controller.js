const itemsService = require('./candidate.items.service');
const { success } = require('../../utils/response');

// Bọc handler để khỏi lặp try/catch ở từng hàm
function handle(fn, message, statusCode) {
  return async (req, res, next) => {
    try {
      const data = await fn(req);
      return success(res, data, message, statusCode);
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  createSkill: handle(
    (req) => itemsService.createSkill(req.user.userId, req.body || {}),
    'Thêm kỹ năng thành công',
    201
  ),
  updateSkill: handle(
    (req) => itemsService.updateSkill(req.user.userId, req.params.id, req.body || {}),
    'Cập nhật kỹ năng thành công'
  ),
  deleteSkill: handle(
    (req) => itemsService.deleteSkill(req.user.userId, req.params.id),
    'Xóa kỹ năng thành công'
  ),

  createExperience: handle(
    (req) => itemsService.createExperience(req.user.userId, req.body || {}),
    'Thêm kinh nghiệm thành công',
    201
  ),
  updateExperience: handle(
    (req) => itemsService.updateExperience(req.user.userId, req.params.id, req.body || {}),
    'Cập nhật kinh nghiệm thành công'
  ),
  deleteExperience: handle(
    (req) => itemsService.deleteExperience(req.user.userId, req.params.id),
    'Xóa kinh nghiệm thành công'
  ),

  createEducation: handle(
    (req) => itemsService.createEducation(req.user.userId, req.body || {}),
    'Thêm học vấn thành công',
    201
  ),
  updateEducation: handle(
    (req) => itemsService.updateEducation(req.user.userId, req.params.id, req.body || {}),
    'Cập nhật học vấn thành công'
  ),
  deleteEducation: handle(
    (req) => itemsService.deleteEducation(req.user.userId, req.params.id),
    'Xóa học vấn thành công'
  ),
};
