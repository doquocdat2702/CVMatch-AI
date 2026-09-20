const express = require('express');
const cvController = require('./cv.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const uploadSingleFile = require('../../middleware/upload.middleware');

const router = express.Router();

router.use(authenticate, authorize('CANDIDATE'));

router.post('/upload', uploadSingleFile, cvController.upload);
router.get('/', cvController.list);
router.post('/:id/extract', cvController.extract);
router.get('/:id', cvController.detail);
router.delete('/:id', cvController.remove);

module.exports = router;
