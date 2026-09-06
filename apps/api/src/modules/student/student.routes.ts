import { Router } from 'express';
import { studentController } from './student.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantGuard } from '../../middleware/tenant.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(tenantGuard);

router.post('/', (req, res, next) => studentController.createStudent(req, res, next));
router.get('/', (req, res, next) => studentController.listStudents(req, res, next));
router.get('/:studentId', (req, res, next) => studentController.getStudent(req, res, next));
router.put('/:studentId', (req, res, next) => studentController.updateStudent(req, res, next));
router.delete('/:studentId', (req, res, next) => studentController.deleteStudent(req, res, next));

export const studentRoutes = router;
