import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantGuard } from '../../middleware/tenant.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(tenantGuard);

router.post('/check-in', (req, res, next) => attendanceController.checkIn(req, res, next));
router.post('/check-out', (req, res, next) => attendanceController.checkOut(req, res, next));
router.get('/today', (req, res, next) => attendanceController.getTodayRoster(req, res, next));
router.get('/students/:studentId', (req, res, next) => attendanceController.getStudentHistory(req, res, next));
router.get('/dashboard', (req, res, next) => attendanceController.getDashboard(req, res, next));

export const attendanceRoutes = router;
