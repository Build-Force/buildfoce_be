import { RequestHandler, Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { createReview, getByTarget, getMyReviews } from '../controllers/reviewController';

const router = Router();

router.post(
    '/',
    authMiddleware as RequestHandler,
    validate([
        body('applicationId').notEmpty().withMessage('applicationId is required'),
        body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be 1-5'),
        body('comment').optional().isString().trim(),
    ]),
    createReview as RequestHandler
);

router.get('/me', authMiddleware as RequestHandler, getMyReviews as RequestHandler);
router.get('/target/:id', getByTarget as RequestHandler);

export default {
    router,
    path: '/reviews',
};
