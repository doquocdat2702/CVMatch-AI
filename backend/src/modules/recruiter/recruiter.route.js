const express = require('express');
const recruiterController = require('./recruiter.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate, authorize('RECRUITER'));

router.get('/me', recruiterController.getMe);
router.put('/me', recruiterController.updateMe);

// Trang Tổng quan của HR: ?scope=mine (mặc định) | all
router.get('/dashboard', recruiterController.dashboard);

module.exports = router;
