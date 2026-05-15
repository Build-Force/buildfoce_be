import { Router } from 'express';
import { exportDashboard, getDashboard } from '../../controllers/admin/dashboard.controller';
import { validateRequest } from '../../middlewares/validate';
import { dashboardExportQueryValidator, dashboardQueryValidator } from '../../validators/adminValidators';

const router = Router();

router.get('/', dashboardQueryValidator, validateRequest, getDashboard);
router.get('/export', dashboardExportQueryValidator, validateRequest, exportDashboard);

export default router;
