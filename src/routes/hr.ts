import { Router } from 'express';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { listHrJobs } from '../controllers/jobController';

const router = Router();

router.get('/jobs', authMiddleware, requirePermission('create:job'), listHrJobs);

export default {
    router,
    path: '/hr',
};

