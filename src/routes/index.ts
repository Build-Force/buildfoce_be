import { Router } from 'express';
import testRoutes from './test';
import adminRoutes from './admin/index';
import authRoutes from './auth';
import surveyRoutes from './survey';
import paymentRoutes from './payment';
import sepayWebhookRoutes from './sepayWebhook';
import { sepayWebhook } from '../controllers/sepayWebhookController';
import jobsRoutes from './jobs';
import aiRoutes from './ai';
import chatRoutes from './chat';
import hrRoutes from './hr';
import usersRoutes from './users';
import blogRoutes from './blogRoutes';
import reviewRoutes from './reviewRoutes';

const router = Router();

router.use(testRoutes.path, testRoutes.router);
router.use(adminRoutes.path, adminRoutes.router);
router.use(authRoutes.path, authRoutes.router);
router.use(surveyRoutes.path, surveyRoutes.router);
router.use(paymentRoutes.path, paymentRoutes.router);
router.use(sepayWebhookRoutes.path, sepayWebhookRoutes.router);
router.post('/wallet/sepay-webhook', sepayWebhook);
router.use(jobsRoutes.path, jobsRoutes.router);
router.use(aiRoutes.path, aiRoutes.router);
router.use(chatRoutes.path, chatRoutes.router);
router.use(hrRoutes.path, hrRoutes.router);
router.use(usersRoutes.path, usersRoutes.router);
router.use(reviewRoutes.path, reviewRoutes.router);
router.use(blogRoutes.path, blogRoutes.router);

export default router;
