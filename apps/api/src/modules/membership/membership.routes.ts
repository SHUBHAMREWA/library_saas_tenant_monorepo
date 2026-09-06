import { Router } from 'express';
import { membershipController } from './membership.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantGuard } from '../../middleware/tenant.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(tenantGuard);

router.post('/', (req, res, next) => membershipController.createMembership(req, res, next));
router.get('/expiring', (req, res, next) => membershipController.getExpiring(req, res, next));
router.post('/:membershipId/pause', (req, res, next) => membershipController.pauseMembership(req, res, next));
router.post('/:membershipId/resume', (req, res, next) => membershipController.resumeMembership(req, res, next));
router.post('/:membershipId/renew', (req, res, next) => membershipController.renewMembership(req, res, next));

export const membershipRoutes = router;
