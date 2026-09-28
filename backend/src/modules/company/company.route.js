const express = require('express');
const companyController = require('./company.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

// /me cần đăng nhập và phải là nhà tuyển dụng
router.get('/me', authenticate, authorize('RECRUITER'), companyController.getMine);
router.put('/me', authenticate, authorize('RECRUITER'), companyController.updateMine);

// Xem công khai, không cần token
router.get('/:id', companyController.getById);

module.exports = router;
