import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { JobApplication } from '../models/JobApplication';
import { Review } from '../models/Review';
import { HrProfile } from '../models/HrProfile';

const getAuthUserId = (req: AuthRequest): string => {
    const rawId = (req.user as any)?.userId ?? (req.user as any)?._id;
    if (typeof rawId === 'string') return rawId;
    return String(rawId);
};

/**
 * POST /reviews - Create a review for a completed application.
 * Body: { applicationId, rating (1-5), comment? }
 * Reviewer must be HR or Worker of the application; target is the other party.
 */
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const { applicationId, rating, comment } = req.body as { applicationId: string; rating: number; comment?: string };

        if (!applicationId) {
            res.status(400).json({ success: false, message: 'applicationId is required.' });
            return;
        }
        const numRating = Number(rating);
        if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
            res.status(400).json({ success: false, message: 'rating must be an integer between 1 and 5.' });
            return;
        }

        const application = await JobApplication.findById(applicationId).lean();
        if (!application) {
            res.status(404).json({ success: false, message: 'Application not found.' });
            return;
        }
        if (application.status !== 'COMPLETED') {
            res.status(422).json({ success: false, message: 'Chỉ được đánh giá sau khi công việc đã hoàn thành.' });
            return;
        }

        const isWorker = application.workerId.toString() === userId;
        const isHr = application.hrId.toString() === userId;
        if (!isWorker && !isHr) {
            res.status(403).json({ success: false, message: 'Access denied.' });
            return;
        }

        const existing = await Review.findOne({ applicationId, reviewerId: userId }).lean();
        if (existing) {
            res.status(409).json({ success: false, message: 'Bạn đã đánh giá cho đơn này.' });
            return;
        }

        const reviewerRole = isHr ? 'HR' : 'EMPLOYEE';
        const targetId = isHr ? application.workerId : application.hrId;

        const review = await Review.create({
            applicationId: application._id,
            jobId: application.jobId,
            reviewerId: userId,
            targetId,
            reviewerRole,
            rating: numRating,
            comment: comment != null ? String(comment).trim() : '',
        });

        // If target is HR, recalc and update HrProfile.averageRating
        const hrProfile = await HrProfile.findOne({ userId: targetId }).lean();
        if (hrProfile) {
            const stats = await Review.aggregate([
                { $match: { targetId } },
                { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
            ]);
            const avg = stats[0]?.avg ?? 0;
            await HrProfile.updateOne({ userId: targetId }, { averageRating: Math.round(avg * 10) / 10 });
        }

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ success: false, message: 'Failed to create review.' });
    }
};

/**
 * GET /reviews/target/:userId - List reviews received by a user (e.g. for HR public profile).
 */
export const getByTarget = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id: targetUserId } = req.params as { id: string };
        const limit = Math.min(Math.max(0, Number(req.query.limit) || 20), 50);

        const reviews = await Review.find({ targetId: targetUserId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('reviewerId', 'firstName lastName avatar')
            .populate('jobId', 'title')
            .lean();

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get reviews by target error:', error);
        res.status(500).json({ success: false, message: 'Failed to get reviews.' });
    }
};

/**
 * GET /reviews/me - List reviews sent by current user (to know which applications already reviewed).
 */
export const getMyReviews = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const reviews = await Review.find({ reviewerId: userId })
            .select('applicationId rating comment createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to get reviews.' });
    }
};
