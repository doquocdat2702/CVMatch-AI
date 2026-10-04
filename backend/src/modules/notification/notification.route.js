const express = require('express');
const notificationController = require('./notification.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = express.Router();

// Mọi role đều cần token, và chỉ thao tác trên thông báo của chính mình
router.use(authenticate);

router.get('/', notificationController.list);
// Các route tĩnh khai báo TRƯỚC /:id
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
