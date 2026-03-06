import { Router } from 'express';
import testRoutes from './test';
import authRoutes from './auth';
import surveyRoutes from './survey';
import aiRoutes from './ai';
import chatRoutes from './chat';
import jobsRoutes from './jobs';
import hrRoutes from './hr';
import adminRoutes from './admin';
import usersRoutes from './users';

const router = Router();

router.use(testRoutes.path, testRoutes.router);
router.use(authRoutes.path, authRoutes.router);
router.use(surveyRoutes.path, surveyRoutes.router);
router.use(aiRoutes.path, aiRoutes.router);
router.use(chatRoutes.path, chatRoutes.router);
router.use(jobsRoutes.path, jobsRoutes.router);
router.use(hrRoutes.path, hrRoutes.router);
router.use(adminRoutes.path, adminRoutes.router);
router.use(usersRoutes.path, usersRoutes.router);

export default router;