import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { listAppliedJobs } from '../controllers/userJobsController';

const router = Router();

router.get('/jobs/applied', authMiddleware, requirePermission('read:jobs'), listAppliedJobs);

export default {
    router,
    path: '/users',
};

