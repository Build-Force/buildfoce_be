import { Router } from 'express';
import testRoutes from './test';
import authRoutes from './auth';
import surveyRoutes from './survey';
// TODO: Import your new routes here using the Booca pattern
// import aiSiteRoutes from './aiSite';

const router = Router();

// Mount routes identically to booca methodology
router.use(testRoutes.path, testRoutes.router);
router.use(authRoutes.path, authRoutes.router);
router.use(surveyRoutes.path, surveyRoutes.router);

// router.use(aiSiteRoutes.path, aiSiteRoutes.router);

export default router;