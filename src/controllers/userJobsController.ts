import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { JobApplication } from '../models/JobApplication';

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

        res.json({ success: true, data: applications });
    } catch (error) {
        console.error('List applied jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to list applied jobs.' });
    }
};

