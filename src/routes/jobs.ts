import { RequestHandler, Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { authMiddleware, optionalAuthMiddleware, requirePermission } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { uploadJobImage, handleUploadError } from '../middlewares/upload';
import {
    createJobDraft,
    updateJobDraft,
    closeJob,
    listPublicJobs,
    listMatchedJobsForEmployee,
    listMatchedWorkersForJob,
    getJobDetail,
    submitJobForApproval,
} from '../controllers/jobController';
import { applyToJob, listApplicantsForJob, updateApplicantStatus, confirmHire, confirmComplete } from '../controllers/applyController';

const router = Router();

// Public list/detail (detail supports optional auth for owner/admin view of non-approved)
router.get('/', listPublicJobs);
router.get('/matched', authMiddleware as RequestHandler, listMatchedJobsForEmployee as RequestHandler);
router.get('/:jobId/matched-workers', authMiddleware as RequestHandler, requirePermission('manage:candidates') as RequestHandler, listMatchedWorkersForJob as RequestHandler);
router.get('/:jobId', optionalAuthMiddleware as RequestHandler, getJobDetail as RequestHandler);

// HR upload job image (must be before /:jobId)
router.post(
    '/upload/image',
    authMiddleware as RequestHandler,
    requirePermission('create:job') as RequestHandler,
    uploadJobImage.single('image'),
    handleUploadError,
    (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided. Send as multipart/form-data with field name "image".',
            });
        }
        const url = (req.file as any).path || (req.file as any).secure_url;
        return res.json({
            success: true,
            data: { url },
        });
    }
);

// HR create/update/submit
router.post(
    '/',
    authMiddleware as RequestHandler,
    requirePermission('create:job') as RequestHandler,
    validate([
        body('title').trim().notEmpty().withMessage('title is required'),
        body('location.province').trim().notEmpty().withMessage('location.province is required'),
        body('salary.amount').isNumeric().withMessage('salary.amount must be a number'),
        body('salary.unit').isIn(['day', 'month', 'hour', 'project']).withMessage('salary.unit invalid'),
        body('workersNeeded').isInt({ min: 1 }).withMessage('workersNeeded must be >= 1'),
    ]),
    createJobDraft as RequestHandler
);

router.put(
    '/:jobId',
    authMiddleware as RequestHandler,
    requirePermission('create:job') as RequestHandler,
    updateJobDraft as RequestHandler
);

router.post(
    '/:jobId/submit',
    authMiddleware as RequestHandler,
    requirePermission('create:job') as RequestHandler,
    submitJobForApproval as RequestHandler
);
router.put(
    '/:jobId/close',
    authMiddleware as RequestHandler,
    requirePermission('create:job') as RequestHandler,
    closeJob as RequestHandler
);

// Apply workflow
router.post('/:jobId/apply', authMiddleware as RequestHandler, requirePermission('apply:job') as RequestHandler, applyToJob as RequestHandler);
router.get('/:jobId/applicants', authMiddleware as RequestHandler, requirePermission('manage:candidates') as RequestHandler, listApplicantsForJob as RequestHandler);
router.put(
    '/:jobId/applicants/:applicationId',
    authMiddleware as RequestHandler,
    requirePermission('manage:candidates') as RequestHandler,
    validate([body('action').isIn(['accept', 'reject']).withMessage('action must be accept or reject')]),
    updateApplicantStatus as RequestHandler
);
router.put('/:jobId/applicants/:applicationId/confirm-hire', authMiddleware as RequestHandler, requirePermission('manage:candidates') as RequestHandler, confirmHire as RequestHandler);
router.put('/:jobId/applicants/:applicationId/confirm-complete', authMiddleware as RequestHandler, confirmComplete as RequestHandler);

export default {
    router,
    path: '/jobs',
};