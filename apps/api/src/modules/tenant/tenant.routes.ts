import { Router } from 'express';
import { tenantController } from './tenant.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', (req, res, next) => tenantController.createLibrary(req, res, next));
router.get('/', (req, res, next) => tenantController.listLibraries(req, res, next));
router.get('/:libraryId', (req, res, next) => tenantController.getLibrary(req, res, next));
router.put('/:libraryId', (req, res, next) => tenantController.updateLibrary(req, res, next));

export const tenantRoutes = router;
