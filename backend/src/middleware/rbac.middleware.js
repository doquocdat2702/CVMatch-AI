const { error } = require('../utils/response');

// authorize('ADMIN') hoặc authorize('RECRUITER', 'ADMIN')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Bạn cần đăng nhập để tiếp tục.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(res, 'Không có quyền thực hiện thao tác này.', 403);
    }

    return next();
  };
}

module.exports = { authorize };
