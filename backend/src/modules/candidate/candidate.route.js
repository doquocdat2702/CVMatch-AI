const express = require('express');
const candidateController = require('./candidate.controller');
const itemsController = require('./candidate.items.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);

const onlyCandidate = authorize('CANDIDATE');

router.get('/me', onlyCandidate, candidateController.getMe);
router.put('/me', onlyCandidate, candidateController.updateMe);

// Ứng viên tự sửa dữ liệu hệ thống phân tích ra
router.post('/me/skills', onlyCandidate, itemsController.createSkill);
router.put('/me/skills/:id', onlyCandidate, itemsController.updateSkill);
router.delete('/me/skills/:id', onlyCandidate, itemsController.deleteSkill);

router.post('/me/experiences', onlyCandidate, itemsController.createExperience);
router.put('/me/experiences/:id', onlyCandidate, itemsController.updateExperience);
router.delete('/me/experiences/:id', onlyCandidate, itemsController.deleteExperience);

router.post('/me/educations', onlyCandidate, itemsController.createEducation);
router.put('/me/educations/:id', onlyCandidate, itemsController.updateEducation);
router.delete('/me/educations/:id', onlyCandidate, itemsController.deleteEducation);

router.get('/:id', authorize('RECRUITER'), candidateController.getById);

module.exports = router;
