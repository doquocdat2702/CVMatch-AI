const express = require('express');
const jobController = require('./job.controller');
const authenticate = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

const router = express.Router();

const recruiterOnly = [authenticate, authorize('RECRUITER')];

router.post('/', recruiterOnly, jobController.create);

// Xem công khai, không cần token
router.get('/', jobController.list);

// /my phải khai báo TRƯỚC /:id để không bị /:id bắt mất
router.get('/my', recruiterOnly, jobController.listMine);

router.get('/:id', jobController.getById);

router.put('/:id', recruiterOnly, jobController.update);
router.patch('/:id/close', recruiterOnly, jobController.close);
router.delete('/:id', recruiterOnly, jobController.remove);

module.exports = router;
