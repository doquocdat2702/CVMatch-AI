const express = require('express');
const applicationController = require('./application.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

const candidateOnly = [authenticate, authorize('CANDIDATE')];
const recruiterOnly = [authenticate, authorize('RECRUITER')];
const candidateOrRecruiter = [authenticate, authorize('CANDIDATE', 'RECRUITER')];

router.post('/', candidateOnly, applicationController.apply);

// /my và /job/:jobId phải khai báo TRƯỚC /:id
router.get('/my', candidateOnly, applicationController.listMine);
router.get('/job/:jobId', recruiterOnly, applicationController.listByJob);

router.get('/:id', candidateOrRecruiter, applicationController.detail);
router.patch('/:id/status', recruiterOnly, applicationController.updateStatus);
router.delete('/:id', candidateOnly, applicationController.withdraw);

module.exports = router;
