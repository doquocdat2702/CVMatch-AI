const express = require('express');
const recruiterController = require('./recruiter.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate, authorize('RECRUITER'));

router.get('/me', recruiterController.getMe);
router.put('/me', recruiterController.updateMe);

module.exports = router;
