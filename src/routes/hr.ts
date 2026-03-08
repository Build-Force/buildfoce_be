import { RequestHandler, Router } from 'express';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { listHrJobs } from '../controllers/jobController';
import { listHiredWorkers } from '../controllers/applyController';
import { getHrDashboard } from '../controllers/hrDashboard.controller';

const router = Router();

router.get('/dashboard', authMiddleware as RequestHandler, requirePermission('create:job') as RequestHandler, getHrDashboard as RequestHandler);
router.get('/jobs', authMiddleware as RequestHandler, requirePermission('create:job') as RequestHandler, listHrJobs as RequestHandler);
router.get('/workers', authMiddleware as RequestHandler, requirePermission('manage:candidates') as RequestHandler, listHiredWorkers as RequestHandler);

export default {
    router,
    path: '/hr',
};

