import { Router } from 'express';
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

router.use(verifyToken);
router.use(requireRole('ADMIN'));

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
