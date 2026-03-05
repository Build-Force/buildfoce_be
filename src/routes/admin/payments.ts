import { Router } from 'express';
import { getPayments } from '../../controllers/admin/payments.controller';

const router = Router();

router.get('/', getPayments);

export default router;
