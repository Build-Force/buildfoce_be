import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { JobApplication } from '../models/JobApplication';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { HrProfile } from '../models/HrProfile';

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

export const toggleSaveContractor = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const { contractorId } = req.body;

        if (!contractorId) {
            res.status(400).json({ success: false, message: 'Contractor ID is required' });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Initialize if not exists
        if (!user.savedContractors) {
            user.savedContractors = [];
        }

        const index = user.savedContractors.findIndex((id: any) => id.toString() === contractorId);

        let saved = false;
        if (index > -1) {
            user.savedContractors.splice(index, 1);
        } else {
            user.savedContractors.push(contractorId);
            saved = true;
        }

        await user.save();

        res.json({ success: true, saved, message: saved ? 'Saved contractor' : 'Removed contractor' });
    } catch (error) {
        console.error('Toggle save contractor error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getSavedContractors = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const user = await User.findById(userId)
            .populate({
                path: 'savedContractors',
                select: 'firstName lastName companyName avatar role',
            })
            .lean();

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Fetch HR profiles for additional info if needed (like rating)
        const savedUsers = (user as any).savedContractors || [];
        const savedUserIds = savedUsers.map((u: any) => u._id);

        const hrProfiles = await HrProfile.find({ userId: { $in: savedUserIds } }).lean();
        const hrProfileMap: Record<string, any> = {};
        hrProfiles.forEach((p) => {
            hrProfileMap[p.userId.toString()] = p;
        });

        const data = savedUsers.map((u: any) => ({
            ...u,
            hrInfo: hrProfileMap[u._id.toString()] || null,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get saved contractors error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
