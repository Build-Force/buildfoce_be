import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { listPendingJobs, approveJob, rejectJob } from '../controllers/adminJobController';
import { activateHrPackage } from '../controllers/adminPackageController';

const router = Router();

// Jobs moderation
router.get('/jobs/pending', authMiddleware, requirePermission('manage:jobs'), listPendingJobs);
router.put('/jobs/:jobId/approve', authMiddleware, requirePermission('manage:jobs'), approveJob);
router.put(
    '/jobs/:jobId/reject',
    authMiddleware,
    requirePermission('manage:jobs'),
    validate([body('reason').optional().isString().withMessage('reason must be string')]),
    rejectJob
);

// HR package activation (dev)
router.put(
    '/hr/:userId/package',
    authMiddleware,
    requirePermission('manage:users'),
    validate([
        body('tier').trim().notEmpty().withMessage('tier is required'),
        body('activeUntil').trim().notEmpty().withMessage('activeUntil is required'),
    ]),
    activateHrPackage
);

export default {
    router,
    path: '/admin',
};

