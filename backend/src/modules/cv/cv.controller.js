const cvService = require('./cv.service');
const { success } = require('../../utils/response');

async function upload(req, res, next) {
  try {
    const data = await cvService.createCv(req.user.userId, req.file, req.candidateProfileId);
    return success(res, data, 'Tải CV lên thành công', 201);
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await cvService.listMyCvs(req.user.userId);
    return success(res, data, 'Lấy danh sách CV thành công');
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await cvService.getCvDetail(req.user.userId, req.params.id);
    return success(res, data, 'Lấy chi tiết CV thành công');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await cvService.deleteCv(req.user.userId, req.params.id);
    return success(res, data, 'Xóa CV thành công');
  } catch (err) {
    return next(err);
  }
}

async function extract(req, res, next) {
  try {
    const data = await cvService.extractCvText(req.user.userId, req.params.id);
    return success(res, data, 'Trích xuất nội dung CV thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { upload, list, detail, remove, extract };
