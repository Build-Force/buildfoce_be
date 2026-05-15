import { Router } from 'express';
import { getUserById, getUsers, updateUserStatus } from '../../controllers/admin/users.controller';
import { validateRequest } from '../../middlewares/validate';
import { mongoIdParamValidator, updateUserStatusValidator, usersListValidator } from '../../validators/adminValidators';

const router = Router();

router.get('/', usersListValidator, validateRequest, getUsers);
router.get('/:id', mongoIdParamValidator, validateRequest, getUserById);
router.patch('/:id/status', updateUserStatusValidator, validateRequest, updateUserStatus);

export default router;
