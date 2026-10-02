const express = require('express');
const aiController = require('./ai.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

// Xem ma trận đối chiếu yêu cầu - bằng chứng, tính trực tiếp, không lưu bảng
router.get(
  '/job/:jobId/candidate/:candidateId',
  authenticate,
  authorize('CANDIDATE', 'RECRUITER'),
  aiController.getMatching
);

module.exports = router;
