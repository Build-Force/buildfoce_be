import { Router } from 'express';
import { getSettings, updateSettings } from '../../controllers/admin/settings.controller';
import { validateRequest } from '../../middlewares/validate';
import { updateSettingsValidator } from '../../validators/adminValidators';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettingsValidator, validateRequest, updateSettings);

export default router;
