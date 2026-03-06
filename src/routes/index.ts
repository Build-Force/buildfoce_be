import { Router } from 'express';
import testRoutes from './test';
import authRoutes from './auth';
import surveyRoutes from './survey';
import paymentRoutes from './payment';
import sepayWebhookRoutes from './sepayWebhook';
import jobRoutes from './jobs';

const router = Router();

router.use(testRoutes.path, testRoutes.router);
router.use(authRoutes.path, authRoutes.router);
router.use(surveyRoutes.path, surveyRoutes.router);
router.use(paymentRoutes.path, paymentRoutes.router);
router.use(sepayWebhookRoutes.path, sepayWebhookRoutes.router);
router.use(jobRoutes.path, jobRoutes.router);

export default router;