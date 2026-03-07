import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware, optionalAuthMiddleware, requirePermission } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import {
    createJobDraft,
    updateJobDraft,
    listPublicJobs,
    getJobDetail,
    submitJobForApproval,
} from '../controllers/jobController';
import { applyToJob, listApplicantsForJob, updateApplicantStatus, confirmHire, confirmComplete } from '../controllers/applyController';

const router = Router();

// Public list/detail (detail supports optional auth for owner/admin view of non-approved)
router.get('/', listPublicJobs);
router.get('/:jobId', optionalAuthMiddleware, getJobDetail);

// HR create/update/submit
router.post(
    '/',
    authMiddleware,
    requirePermission('create:job'),
    validate([
        body('title').trim().notEmpty().withMessage('title is required'),
        body('location.province').trim().notEmpty().withMessage('location.province is required'),
        body('salary.amount').isNumeric().withMessage('salary.amount must be a number'),
        body('salary.unit').isIn(['day', 'month', 'hour', 'project']).withMessage('salary.unit invalid'),
        body('workersNeeded').isInt({ min: 1 }).withMessage('workersNeeded must be >= 1'),
    ]),
    createJobDraft
);

router.put(
    '/:jobId',
    authMiddleware,
    requirePermission('create:job'),
    updateJobDraft
);

router.post(
    '/:jobId/submit',
    authMiddleware,
    requirePermission('create:job'),
    submitJobForApproval
);

// Apply workflow
router.post('/:jobId/apply', authMiddleware, requirePermission('apply:job'), applyToJob);
router.get('/:jobId/applicants', authMiddleware, requirePermission('manage:candidates'), listApplicantsForJob);
router.put(
    '/:jobId/applicants/:applicationId',
    authMiddleware,
    requirePermission('manage:candidates'),
    validate([body('action').isIn(['accept', 'reject']).withMessage('action must be accept or reject')]),
    updateApplicantStatus
);
router.put('/:jobId/applicants/:applicationId/confirm-hire', authMiddleware, requirePermission('manage:candidates'), confirmHire);
router.put('/:jobId/applicants/:applicationId/confirm-complete', authMiddleware, confirmComplete);

export default {
    router,
    path: '/jobs',
};

