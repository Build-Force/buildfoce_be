import { Router } from 'express';
import { getDisputeById, getDisputes, updateDisputeStatus } from '../../controllers/admin/disputes.controller';
import { validateRequest } from '../../middlewares/validate';
import {
  disputeStatusValidator,
  disputesListValidator,
  mongoIdParamValidator,
} from '../../validators/adminValidators';

const router = Router();

router.get('/', disputesListValidator, validateRequest, getDisputes);
router.get('/:id', mongoIdParamValidator, validateRequest, getDisputeById);
router.patch('/:id/status', disputeStatusValidator, validateRequest, updateDisputeStatus);

export default router;
