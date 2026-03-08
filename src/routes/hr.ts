import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { listHrJobs } from '../controllers/jobController';
import { listHiredWorkers } from '../controllers/applyController';
import { getHrDashboard } from '../controllers/hrDashboard.controller';

const router = Router();

router.get('/dashboard', authMiddleware, requirePermission('create:job'), getHrDashboard);
router.get('/jobs', authMiddleware, requirePermission('create:job'), listHrJobs);
router.get('/workers', authMiddleware, requirePermission('manage:candidates'), listHiredWorkers);

export default {
    router,
    path: '/hr',
};

