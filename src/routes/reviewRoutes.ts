import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { createReview, getByTarget, getMyReviews } from '../controllers/reviewController';

const router = Router();

router.post(
    '/',
    authMiddleware,
    validate([
        body('applicationId').notEmpty().withMessage('applicationId is required'),
        body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be 1-5'),
        body('comment').optional().isString().trim(),
    ]),
    createReview
);

router.get('/me', authMiddleware, getMyReviews);
router.get('/target/:id', getByTarget);

export default {
    router,
    path: '/reviews',
};
