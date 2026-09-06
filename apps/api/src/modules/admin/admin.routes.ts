import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { superAdminGuard } from '../../middleware/admin.middleware';

const router: Router = Router();

// Protect all admin endpoints with authentication AND super admin role
router.use(authMiddleware);
router.use(superAdminGuard);

router.get('/libraries', (req, res, next) => adminController.listLibraries(req, res, next));
router.put('/libraries/:libraryId/status', (req, res, next) => adminController.toggleLibraryStatus(req, res, next));
router.get('/coupons', (req, res, next) => adminController.listCoupons(req, res, next));
router.post('/coupons', (req, res, next) => adminController.createCoupon(req, res, next));
router.put('/coupons/:couponId/toggle', (req, res, next) => adminController.toggleCouponStatus(req, res, next));
router.get('/audit-logs', (req, res, next) => adminController.listAuditLogs(req, res, next));
router.get('/metrics', (req, res, next) => adminController.getMetrics(req, res, next));

export const adminRoutes: Router = router;
