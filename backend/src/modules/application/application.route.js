const express = require('express');
const applicationController = require('./application.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

const candidateOnly = [authenticate, authorize('CANDIDATE')];
const recruiterOnly = [authenticate, authorize('RECRUITER')];
const candidateOrRecruiter = [authenticate, authorize('CANDIDATE', 'RECRUITER')];

router.post('/', candidateOnly, applicationController.apply);

// /my, /mine và /job/:jobId phải khai báo TRƯỚC /:id
router.get('/my', candidateOnly, applicationController.listMine);
// Đơn của mọi tin do nhà tuyển dụng đang đăng nhập đăng (T35i)
router.get('/mine', recruiterOnly, applicationController.listMyJobs);
router.get('/job/:jobId', recruiterOnly, applicationController.listByJob);

router.get('/:id', candidateOrRecruiter, applicationController.detail);
router.patch('/:id/status', recruiterOnly, applicationController.updateStatus);
router.delete('/:id', candidateOnly, applicationController.withdraw);

module.exports = router;
