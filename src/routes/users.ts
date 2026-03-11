import { RequestHandler, Router } from 'express';
import { authMiddleware, requirePermission } from '../middlewares/auth';
import { listAppliedJobs, toggleSaveContractor, getSavedContractors } from '../controllers/userJobsController';
import { getMyCv, upsertMyCv, getPublicProfile } from '../controllers/cvController';

const router = Router();

router.get('/:id/public-profile', getPublicProfile as RequestHandler);

router.get('/jobs/applied', authMiddleware as RequestHandler, requirePermission('read:jobs') as RequestHandler, listAppliedJobs as RequestHandler);

router.get('/cv', authMiddleware as RequestHandler, getMyCv as RequestHandler);
router.put('/cv', authMiddleware as RequestHandler, requirePermission('read:jobs') as RequestHandler, upsertMyCv as RequestHandler);

router.get('/contractors/saved', authMiddleware as RequestHandler, getSavedContractors as RequestHandler);
router.post('/contractors/save', authMiddleware as RequestHandler, toggleSaveContractor as RequestHandler);

export default {
    router,
    path: '/users',
};

