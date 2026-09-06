import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantGuard } from '../../middleware/tenant.middleware';

const router = Router({ mergeParams: true });

// Public endpoints
router.get('/plans', (req, res, next) => paymentController.listPlans(req, res, next));
router.post('/webhook', (req, res, next) => paymentController.handleWebhook(req, res, next));

// Authenticated endpoints
router.post('/coupons/validate', authMiddleware, (req, res, next) => paymentController.validateCoupon(req, res, next));
router.post('/admin/manual-grant', authMiddleware, (req, res, next) => paymentController.adminManualGrant(req, res, next));

// Tenant-scoped endpoints
router.post('/orders', authMiddleware, tenantGuard, (req, res, next) => paymentController.createOrder(req, res, next));
router.get('/status', authMiddleware, tenantGuard, (req, res, next) => paymentController.getSubscriptionStatus(req, res, next));

export const paymentRoutes = router;
