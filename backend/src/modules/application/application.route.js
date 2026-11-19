const express = require('express');
const applicationController = require('./application.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

const candidateOnly = [authenticate, authorize('CANDIDATE')];
const recruiterOnly = [authenticate, authorize('RECRUITER')];
const candidateOrRecruiter = [authenticate, authorize('CANDIDATE', 'RECRUITER')];
// Xem đơn của một tin và đổi trạng thái đơn: HR (đổi trạng thái chỉ người đăng tin) hoặc ADMIN (QA-01)
const jobManagers = [authenticate, authorize('RECRUITER', 'ADMIN')];

router.post('/', candidateOnly, applicationController.apply);

// /my, /mine và /job/:jobId phải khai báo TRƯỚC /:id
router.get('/my', candidateOnly, applicationController.listMine);
// Đơn của mọi tin do nhà tuyển dụng đang đăng nhập đăng (T35i)
router.get('/mine', recruiterOnly, applicationController.listMyJobs);
router.get('/job/:jobId', jobManagers, applicationController.listByJob);

router.get('/:id', candidateOrRecruiter, applicationController.detail);
router.patch('/:id/status', jobManagers, applicationController.updateStatus);
router.delete('/:id', candidateOnly, applicationController.withdraw);

module.exports = router;
