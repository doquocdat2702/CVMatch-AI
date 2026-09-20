const { error } = require('../utils/response');

// authorize('ADMIN') hoặc authorize('RECRUITER', 'ADMIN')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Thiếu token xác thực', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(res, 'Bạn không có quyền truy cập', 403);
    }

    return next();
  };
}

module.exports = { authorize };
