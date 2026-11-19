const express = require('express');
const jobController = require('./job.controller');
const requirementController = require('./job.requirement.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

const recruiterOnly = [authenticate, authorize('RECRUITER')];
// Sửa / đóng / xóa tin, phân tích JD, sửa yêu cầu: người đăng tin hoặc ADMIN (QA-01).
// Kiểm "đúng người đăng" nằm trong assertCanManageJob; ADMIN đi qua không điều kiện
const jobManagers = [authenticate, authorize('RECRUITER', 'ADMIN')];

router.post('/', recruiterOnly, jobController.create);

// Xem công khai, không cần token
router.get('/', jobController.list);

// /my phải khai báo TRƯỚC /:id để không bị /:id bắt mất.
// RECRUITER: tin của chính mình; ADMIN: mọi tin của mọi HR (trang /admin/jobs, QA3)
router.get('/my', jobManagers, jobController.listMine);

router.get('/:id', jobController.getById);

router.put('/:id', jobManagers, jobController.update);
router.patch('/:id/close', jobManagers, jobController.close);
router.delete('/:id', jobManagers, jobController.remove);

// Phân tích JD thành JobRequirement, ghi đè bộ cũ
router.post('/:id/parse-jd', jobManagers, requirementController.parseJd);

// Quản lý requirement: xem công khai, sửa tay dành cho nhà tuyển dụng
router.get('/:id/requirements', requirementController.list);
router.post('/:id/requirements', jobManagers, requirementController.create);
router.put('/:id/requirements/:reqId', jobManagers, requirementController.update);
router.delete('/:id/requirements/:reqId', jobManagers, requirementController.remove);

module.exports = router;
