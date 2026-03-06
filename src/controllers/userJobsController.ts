import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { JobApplication } from '../models/JobApplication';

const getAuthUserId = (req: AuthRequest): string => {
    return req.user?.userId || req.user?._id;
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

