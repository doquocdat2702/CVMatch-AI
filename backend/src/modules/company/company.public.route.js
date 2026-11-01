const express = require('express');
const companyController = require('./company.controller');

const router = express.Router();

// GET /api/company/public: công ty duy nhất của hệ thống, xem công khai không cần token
// (trang Giới thiệu và Liên hệ). Khác /companies/:id ở chỗ không cần biết mã công ty
router.get('/public', companyController.getPublic);

module.exports = router;
