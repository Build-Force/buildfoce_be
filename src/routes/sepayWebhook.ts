import { Router } from 'express';
import { sepayWebhook } from '../controllers/sepayWebhookController';
import { PAYMENTS_PATHS } from '../constants/paths';

const router = Router();

// SePay will call this webhook when money arrives
router.post('/webhook/sepay', sepayWebhook);

export default {
  router,
  path: PAYMENTS_PATHS.BASE,
};

