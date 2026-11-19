const express = require('express');
const authController = require('./auth.controller');
const authenticate = require('../../middleware/auth.middleware');
const { loginLimiter, forgotPasswordLimiter, registerLimiter } = require('../../middleware/rate-limit.middleware');

const router = express.Router();

// Giới hạn 30 lần / giờ / IP (QA-25)
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/logout', authController.logout);

// Quên mật khẩu qua email, chỉ dành cho ứng viên
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
