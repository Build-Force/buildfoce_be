import { Router } from 'express';
import testRoutes from './test';
import adminRoutes from './admin';
import authRoutes from './auth';
import surveyRoutes from './survey';
import aiRoutes from './ai';
import chatRoutes from './chat';
import jobsRoutes from './jobs';
import hrRoutes from './hr';
import usersRoutes from './users';
import blogRoutes from './blogRoutes';

const router = Router();

router.use(testRoutes.path, testRoutes.router);
router.use(adminRoutes.path, adminRoutes.router);
router.use(authRoutes.path, authRoutes.router);
router.use(surveyRoutes.path, surveyRoutes.router);
router.use(aiRoutes.path, aiRoutes.router);
router.use(chatRoutes.path, chatRoutes.router);
router.use(jobsRoutes.path, jobsRoutes.router);
router.use(hrRoutes.path, hrRoutes.router);
router.use(usersRoutes.path, usersRoutes.router);
router.use(blogRoutes.path, blogRoutes.router);

export default router;
