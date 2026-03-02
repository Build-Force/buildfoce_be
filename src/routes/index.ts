import { Router } from 'express';
import testRoutes from './test';
// TODO: Import your new routes here using the Booca pattern
// import aiSiteRoutes from './aiSite';

const router = Router();

// Mount routes identically to booca methodology
router.use(testRoutes.path, testRoutes.router);

// router.use(aiSiteRoutes.path, aiSiteRoutes.router);

export default router;