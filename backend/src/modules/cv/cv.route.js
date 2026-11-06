const express = require('express');
const cvController = require('./cv.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const uploadSingleFile = require('../../middleware/upload.middleware');

const router = express.Router();

// Xem file CV gốc (T35f): khai báo TRƯỚC dòng chỉ cho CANDIDATE bên dưới, vì HR / Admin cũng được xem
// CV của ứng viên đã nộp đơn. Quyền chi tiết kiểm ở cv.service getCvFile
router.get('/:id/file', authenticate, authorize('CANDIDATE', 'RECRUITER', 'ADMIN'), cvController.file);

router.use(authenticate, authorize('CANDIDATE'));

router.post('/upload', uploadSingleFile, cvController.upload);
router.get('/', cvController.list);
router.post('/:id/extract', cvController.extract);
router.post('/:id/parse', cvController.parse);
router.get('/:id', cvController.detail);
router.delete('/:id', cvController.remove);

module.exports = router;
