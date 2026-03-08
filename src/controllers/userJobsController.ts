import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { JobApplication } from '../models/JobApplication';
import { Review } from '../models/Review';

const getAuthUserId = (req: AuthRequest): string => {
    const rawId =
        (req.user as any)?.userId ??
        (req.user as any)?._id;

    if (typeof rawId === 'string') {
        return rawId;
    }

    return String(rawId);
};

export const listAppliedJobs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const workerId = getAuthUserId(req);

        const applications = await JobApplication.find({ workerId })
            .sort({ appliedAt: -1 })
            .populate({
                path: 'jobId',
                populate: { path: 'hrId', select: 'firstName lastName companyName avatar' },
            })
            .lean();

        const applicationIds = applications.map((a) => a._id);
        const reviewedAppIds = new Set(
            (await Review.find({ applicationId: { $in: applicationIds }, reviewerId: workerId }).select('applicationId').lean()).map((r) => r.applicationId.toString())
        );
        const hrReviews = await Review.find({ applicationId: { $in: applicationIds }, reviewerRole: 'HR' }).select('applicationId rating').lean();
        const hrRatingByAppId: Record<string, number> = {};
        hrReviews.forEach((r: any) => {
            const num = Number(r.rating);
            if (!Number.isNaN(num)) hrRatingByAppId[r.applicationId.toString()] = num;
        });

        const data = applications.map((app) => ({
            ...app,
            hasWorkerReviewed: reviewedAppIds.has(app._id.toString()),
            hrRating: hrRatingByAppId[app._id.toString()] ?? null,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('List applied jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to list applied jobs.' });
    }
};

