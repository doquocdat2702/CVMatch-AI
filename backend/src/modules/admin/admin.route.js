const express = require('express');
const adminController = require('./admin.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

// Mọi endpoint của module admin đều chỉ dành cho ADMIN
router.use(authenticate, authorize('ADMIN'));

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id/status', adminController.updateStatus);
router.patch('/users/:id/role', adminController.updateRole);
router.delete('/users/:id', adminController.deleteUser);

// Đường duy nhất để có tài khoản Recruiter (không có tự đăng ký)
router.post('/recruiters', adminController.createRecruiter);

router.get('/companies', adminController.listCompanies);

module.exports = router;
