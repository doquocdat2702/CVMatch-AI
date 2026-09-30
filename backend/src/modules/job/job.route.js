const express = require('express');
const jobController = require('./job.controller');
const requirementController = require('./job.requirement.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

const recruiterOnly = [authenticate, authorize('RECRUITER')];

router.post('/', recruiterOnly, jobController.create);

// Xem công khai, không cần token
router.get('/', jobController.list);

// /my phải khai báo TRƯỚC /:id để không bị /:id bắt mất
router.get('/my', recruiterOnly, jobController.listMine);

router.get('/:id', jobController.getById);

router.put('/:id', recruiterOnly, jobController.update);
router.patch('/:id/close', recruiterOnly, jobController.close);
router.delete('/:id', recruiterOnly, jobController.remove);

// Phân tích JD thành JobRequirement, ghi đè bộ cũ
router.post('/:id/parse-jd', recruiterOnly, requirementController.parseJd);

// Quản lý requirement: xem công khai, sửa tay dành cho nhà tuyển dụng
router.get('/:id/requirements', requirementController.list);
router.post('/:id/requirements', recruiterOnly, requirementController.create);
router.put('/:id/requirements/:reqId', recruiterOnly, requirementController.update);
router.delete('/:id/requirements/:reqId', recruiterOnly, requirementController.remove);

module.exports = router;
