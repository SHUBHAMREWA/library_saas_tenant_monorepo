import { Router } from 'express';
import { authRoutes } from '../../modules/auth/auth.routes';
import { tenantRoutes } from '../../modules/tenant/tenant.routes';
import { spaceRoutes } from '../../modules/space/space.routes';
import { storageRoutes } from '../../modules/storage/storage.routes';
import { studentRoutes } from '../../modules/student/student.routes';
import { membershipRoutes } from '../../modules/membership/membership.routes';
import { attendanceRoutes } from '../../modules/attendance/attendance.routes';
import { paymentRoutes } from '../../modules/payment/payment.routes';
import { adminRoutes } from '../../modules/admin/admin.routes';
import { attendanceController } from '../../modules/attendance/attendance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantGuard } from '../../middleware/tenant.middleware';

const router: Router = Router();

// Module mounts
router.use('/auth', authRoutes);
router.use('/libraries', tenantRoutes);
router.use('/libraries/:libraryId/spaces', spaceRoutes);
router.use('/libraries/:libraryId/storage', storageRoutes);
router.use('/libraries/:libraryId/students', studentRoutes);
router.use('/libraries/:libraryId/memberships', membershipRoutes);
router.use('/libraries/:libraryId/attendance', attendanceRoutes);
router.use('/libraries/:libraryId/subscriptions', paymentRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);

// Direct Dashboard API: GET /api/v1/libraries/:libraryId/dashboard
router.get(
  '/libraries/:libraryId/dashboard',
  authMiddleware,
  tenantGuard,
  (req, res, next) => attendanceController.getDashboard(req, res, next)
);

// Overall v1 API status
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      version: '1.0.0',
      modules: [
        'auth',
        'libraries',
        'spaces',
        'storage',
        'students',
        'memberships',
        'attendance',
        'payments',
      ],
      architecture: 'Modular Monolith',
    },
  });
});

export const v1Router: Router = router;
