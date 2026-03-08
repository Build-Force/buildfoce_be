import { RequestHandler, Router } from 'express';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { listAppliedJobs } from '../controllers/userJobsController';

const router = Router();

router.get('/jobs/applied', authMiddleware as RequestHandler, requirePermission('read:jobs') as RequestHandler, listAppliedJobs as RequestHandler);

export default {
    router,
    path: '/users',
};

