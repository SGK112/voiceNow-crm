import express from 'express';
import { signup, login, googleAuth, getMe, forgotPassword, verifyResetCode, resetPassword, updateProfile, getProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.get('/me', protect, getMe);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-reset-code', authLimiter, verifyResetCode);
router.post('/reset-password', authLimiter, resetPassword);

// Profile management
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router;
