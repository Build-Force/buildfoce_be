import { RequestHandler, Router } from 'express';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { listAppliedJobs } from '../controllers/userJobsController';
import { getMyCv, upsertMyCv } from '../controllers/cvController';

const router = Router();

router.get('/jobs/applied', authMiddleware as RequestHandler, requirePermission('read:jobs') as RequestHandler, listAppliedJobs as RequestHandler);

router.get('/cv', authMiddleware as RequestHandler, getMyCv as RequestHandler);
router.put('/cv', authMiddleware as RequestHandler, requirePermission('read:jobs') as RequestHandler, upsertMyCv as RequestHandler);

export default {
    router,
    path: '/users',
};

