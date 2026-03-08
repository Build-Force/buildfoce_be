import { RequestHandler, Router } from 'express';
import dashboardRoutes from './dashboard';
import disputesRoutes from './disputes';
import hrRoutes from './hr';
import jobsRoutes from './jobs';
import paymentsRoutes from './payments';
import settingsRoutes from './settings';
import supportRoutes from './support';
import usersRoutes from './users';
import { verifyToken } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use('/' as const, verifyToken as RequestHandler);
router.use('/' as const, requireRole('ADMIN') as RequestHandler);

router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/hr', hrRoutes);
router.use('/jobs', jobsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/disputes', disputesRoutes);
router.use('/settings', settingsRoutes);
router.use('/support', supportRoutes);

export default {
  path: '/admin',
  router,
};
