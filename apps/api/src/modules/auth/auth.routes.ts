import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.post('/otp/request', (req, res, next) => authController.requestOtp(req, res, next));
router.post('/otp/verify', (req, res, next) => authController.verifyOtp(req, res, next));
router.post('/google', (req, res, next) => authController.googleAuth(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/sync', (req, res, next) => authController.syncUser(req, res, next));
router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));

export const authRoutes = router;
