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
    'Đã thêm kỹ năng.',
    201
  ),
  updateSkill: handle(
    (req) => itemsService.updateSkill(req.user.userId, req.params.id, req.body || {}),
    'Đã cập nhật kỹ năng.'
  ),
  deleteSkill: handle(
    (req) => itemsService.deleteSkill(req.user.userId, req.params.id),
    'Đã xóa kỹ năng.'
  ),

  createExperience: handle(
    (req) => itemsService.createExperience(req.user.userId, req.body || {}),
    'Đã thêm kinh nghiệm.',
    201
  ),
  updateExperience: handle(
    (req) => itemsService.updateExperience(req.user.userId, req.params.id, req.body || {}),
    'Đã cập nhật kinh nghiệm.'
  ),
  deleteExperience: handle(
    (req) => itemsService.deleteExperience(req.user.userId, req.params.id),
    'Đã xóa kinh nghiệm.'
  ),

  createEducation: handle(
    (req) => itemsService.createEducation(req.user.userId, req.body || {}),
    'Đã thêm học vấn.',
    201
  ),
  updateEducation: handle(
    (req) => itemsService.updateEducation(req.user.userId, req.params.id, req.body || {}),
    'Đã cập nhật học vấn.'
  ),
  deleteEducation: handle(
    (req) => itemsService.deleteEducation(req.user.userId, req.params.id),
    'Đã xóa học vấn.'
  ),
};
