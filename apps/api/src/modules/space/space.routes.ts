import { Router } from 'express';
import { spaceController } from './space.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantGuard } from '../../middleware/tenant.middleware';

const router = Router({ mergeParams: true });

// Protect all space endpoints with authentication & tenant context
router.use(authMiddleware);
router.use(tenantGuard);

// Rooms
router.post('/rooms', (req, res, next) => spaceController.createRoom(req, res, next));
router.get('/rooms', (req, res, next) => spaceController.listRooms(req, res, next));
router.delete('/rooms/:roomId', (req, res, next) => spaceController.deleteRoom(req, res, next));

// Rows
router.post('/rows', (req, res, next) => spaceController.createRow(req, res, next));
router.get('/rows', (req, res, next) => spaceController.listRows(req, res, next));
router.delete('/rows/:rowId', (req, res, next) => spaceController.deleteRow(req, res, next));

// Seats
router.post('/seats/batch-generate', (req, res, next) => spaceController.batchGenerateSeats(req, res, next));
router.get('/seats', (req, res, next) => spaceController.listSeats(req, res, next));
router.put('/seats/:seatId/status', (req, res, next) => spaceController.updateSeatStatus(req, res, next));
router.get('/stats', (req, res, next) => spaceController.getSpaceStats(req, res, next));

export const spaceRoutes = router;
