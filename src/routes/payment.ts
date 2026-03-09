import { RequestHandler, Router } from 'express';
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

router.get(PAYMENTS_PATHS.MY_PACKAGE, authMiddleware as RequestHandler, getMyPackage as RequestHandler);

router.post(PAYMENTS_PATHS.CREATE, authMiddleware as RequestHandler, createPayment as RequestHandler);

router.post(PAYMENTS_PATHS.CONFIRM, authMiddleware as RequestHandler, confirmPayment as RequestHandler);

router.get(PAYMENTS_PATHS.HISTORY, authMiddleware as RequestHandler, getPaymentHistory as RequestHandler);

router.get(PAYMENTS_PATHS.SESSION, authMiddleware as RequestHandler, getPaymentSessionStatus as RequestHandler);

router.post(PAYMENTS_PATHS.SEED, seedDefaultPackages);

export default {
  router,
  path: PAYMENTS_PATHS.BASE,
};
