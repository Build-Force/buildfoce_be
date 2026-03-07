import { Router } from 'express';
import {
  getSupportTicketById,
  getSupportTickets,
  updateSupportTicketStatus,
} from '../../controllers/admin/support.controller';
import { validateRequest } from '../../middlewares/validate';
import {
  mongoIdParamValidator,
  supportListValidator,
  supportStatusValidator,
} from '../../validators/adminValidators';

const router = Router();

router.get('/tickets', supportListValidator, validateRequest, getSupportTickets);
router.get('/tickets/:id', mongoIdParamValidator, validateRequest, getSupportTicketById);
router.patch('/tickets/:id/status', supportStatusValidator, validateRequest, updateSupportTicketStatus);

export default router;
