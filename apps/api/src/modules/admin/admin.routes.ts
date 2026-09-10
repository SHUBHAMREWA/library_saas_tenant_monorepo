import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { superAdminGuard } from '../../middleware/admin.middleware';

const router: Router = Router();

// Protect all admin endpoints with authentication AND super admin role
router.use(authMiddleware);
router.use(superAdminGuard);

// Telemetry & Metrics
router.get('/metrics', (req, res, next) => adminController.getMetrics(req, res, next));
router.get('/audit-logs', (req, res, next) => adminController.listAuditLogs(req, res, next));

// Libraries
router.get('/libraries', (req, res, next) => adminController.listLibraries(req, res, next));
router.put('/libraries/:libraryId/status', (req, res, next) => adminController.toggleLibraryStatus(req, res, next));

// Plans
router.get('/plans', (req, res, next) => adminController.listPlans(req, res, next));
router.post('/plans', (req, res, next) => adminController.createPlan(req, res, next));
router.put('/plans/:planId', (req, res, next) => adminController.updatePlan(req, res, next));

// Coupons
router.get('/coupons', (req, res, next) => adminController.listCoupons(req, res, next));
router.post('/coupons', (req, res, next) => adminController.createCoupon(req, res, next));
router.put('/coupons/:couponId', (req, res, next) => adminController.updateCoupon(req, res, next));
router.delete('/coupons/:couponId', (req, res, next) => adminController.deleteCoupon(req, res, next));
router.put('/coupons/:couponId/toggle', (req, res, next) => adminController.toggleCouponStatus(req, res, next));

// Users
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.put('/users/:userId/role', (req, res, next) => adminController.updateUserRole(req, res, next));

// Payments & Subscriptions
router.get('/payments', (req, res, next) => adminController.listPayments(req, res, next));
router.post('/subscriptions/adjust', (req, res, next) => adminController.adjustSubscription(req, res, next));

// Students across all libraries
router.get('/students', (req, res, next) => adminController.listStudents(req, res, next));

// Notifications
router.post('/notifications/broadcast', (req, res, next) => adminController.broadcastNotification(req, res, next));

export const adminRoutes: Router = router;
