import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { JOB_PATHS } from '../constants/paths';
import { createJob } from '../controllers/jobController';
import { listJobs } from '../controllers/jobPublicController';

const router = Router();

// Public list for map/home – prioritised by package
router.get(JOB_PATHS.LIST, listJobs);

// Create job (HR only) with package quota enforcement
router.post(JOB_PATHS.CREATE, authMiddleware, createJob);

export default {
  router,
  path: JOB_PATHS.BASE,
};

