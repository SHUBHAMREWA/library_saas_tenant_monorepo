import { Router } from 'express';
import { storageController } from './storage.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantGuard } from '../../middleware/tenant.middleware';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(tenantGuard);

router.post('/sign-upload', (req, res, next) => storageController.signUpload(req, res, next));
router.get('/kyc/:kycDocId/view-url', (req, res, next) => storageController.getSignedKycUrl(req, res, next));

export const storageRoutes = router;
