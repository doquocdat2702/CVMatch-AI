const express = require('express');
const candidateController = require('./candidate.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/me', authorize('CANDIDATE'), candidateController.getMe);
router.put('/me', authorize('CANDIDATE'), candidateController.updateMe);
router.get('/:id', authorize('RECRUITER'), candidateController.getById);

module.exports = router;
