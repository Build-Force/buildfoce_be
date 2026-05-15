import { Router } from 'express';
import { getHrById, getHrList, updateHrBlacklist, updateHrVerification } from '../../controllers/admin/hr.controller';
import { validateRequest } from '../../middlewares/validate';
import {
  hrBlacklistValidator,
  hrListValidator,
  hrVerificationValidator,
  mongoIdParamValidator,
} from '../../validators/adminValidators';

const router = Router();

router.get('/', hrListValidator, validateRequest, getHrList);
router.get('/:id', mongoIdParamValidator, validateRequest, getHrById);
router.patch('/:id/verification', hrVerificationValidator, validateRequest, updateHrVerification);
router.patch('/:id/blacklist', hrBlacklistValidator, validateRequest, updateHrBlacklist);

export default router;
