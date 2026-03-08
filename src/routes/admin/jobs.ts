import { Router } from 'express';
import { approveJob, getJobs, rejectJob } from '../../controllers/admin/jobs.controller';
import { validateRequest } from '../../middlewares/validate';
import { jobsListValidator, mongoIdParamValidator, rejectJobValidator } from '../../validators/adminValidators';

const router = Router();

router.get('/', jobsListValidator, validateRequest, getJobs);
router.patch('/:id/approve', mongoIdParamValidator, validateRequest, approveJob);
router.patch('/:id/reject', rejectJobValidator, validateRequest, rejectJob);

export default router;
