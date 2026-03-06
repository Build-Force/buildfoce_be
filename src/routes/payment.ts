import { Router } from 'express';
import {
  getPackages,
  getMyPackage,
  createPayment,
  confirmPayment,
  getPaymentHistory,
  getPaymentSessionStatus,
  seedDefaultPackages,
} from '../controllers/paymentController';
import { authMiddleware } from '../middlewares/auth';
import { PAYMENTS_PATHS } from '../constants/paths';

const router = Router();

router.get(PAYMENTS_PATHS.PACKAGES, getPackages);

router.get(PAYMENTS_PATHS.MY_PACKAGE, authMiddleware, getMyPackage);

router.post(PAYMENTS_PATHS.CREATE, authMiddleware, createPayment);

router.post(PAYMENTS_PATHS.CONFIRM, authMiddleware, confirmPayment);

router.get(PAYMENTS_PATHS.HISTORY, authMiddleware, getPaymentHistory);

router.get(PAYMENTS_PATHS.SESSION, authMiddleware, getPaymentSessionStatus);

router.post(PAYMENTS_PATHS.SEED, seedDefaultPackages);

export default {
  router,
  path: PAYMENTS_PATHS.BASE,
};
