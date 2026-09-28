const companyService = require('./company.service');
const { success } = require('../../utils/response');

async function getMine(req, res, next) {
  try {
    const data = await companyService.getMyCompany(req.user.userId);
    return success(res, data, 'Lấy thông tin công ty thành công');
  } catch (err) {
    return next(err);
  }
}

async function updateMine(req, res, next) {
  try {
    const data = await companyService.updateMyCompany(req.user.userId, req.body || {});
    return success(res, data, 'Cập nhật công ty thành công');
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await companyService.getCompanyById(req.params.id);
    return success(res, data, 'Lấy thông tin công ty thành công');
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMine, updateMine, getById };
