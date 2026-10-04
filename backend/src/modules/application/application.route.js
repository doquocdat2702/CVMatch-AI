const express = require('express');
const applicationController = require('./application.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

const candidateOnly = [authenticate, authorize('CANDIDATE')];

router.post('/', candidateOnly, applicationController.apply);

// /my phải khai báo TRƯỚC /:id
router.get('/my', candidateOnly, applicationController.listMine);

router.delete('/:id', candidateOnly, applicationController.withdraw);

module.exports = router;
