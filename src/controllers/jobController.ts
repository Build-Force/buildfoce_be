import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Job } from '../models/Job';
import { JobApplication } from '../models/JobApplication';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/User';

const getAuthUserId = (req: AuthRequest): string => {
    return req.user?.userId || req.user?._id;
};

export const createJobDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const hrId = getAuthUserId(req);

        const {
            title,
            description,
            requirements,
            skills,
            location,
            salary,
            workersNeeded,
            startDate,
            endDate,
        } = req.body;

        const job = await Job.create({
            hrId,
            title,
            description,
            requirements,
            skills: Array.isArray(skills) ? skills : [],
            location,
            salary,
            workersNeeded,
            workersHired: 0,
            startDate,
            endDate,
            status: 'DRAFT',
        });

        res.status(201).json({ success: true, data: job });
    } catch (error) {
        console.error('Create job draft error:', error);
        res.status(500).json({ success: false, message: 'Failed to create job draft.' });
    }
};

export const updateJobDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const hrId = getAuthUserId(req);
        const { jobId } = req.params as any;

        const job = await Job.findOne({ _id: jobId, hrId });
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        if (!['DRAFT', 'REJECTED'].includes(job.status)) {
            res.status(422).json({ success: false, message: 'Job cannot be edited in current status.' });
            return;
        }

        const allowed = ['title', 'description', 'requirements', 'skills', 'location', 'salary', 'workersNeeded', 'startDate', 'endDate'];
        for (const key of allowed) {
            if (key in req.body) {
                (job as any)[key] = (req.body as any)[key];
            }
        }

        // If previously rejected and HR updates, set back to DRAFT to resubmit
        if (job.status === 'REJECTED') job.status = 'DRAFT';

        await job.save();
        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ success: false, message: 'Failed to update job.' });
    }
};

export const listPublicJobs = async (_req: Request, res: Response): Promise<void> => {
    try {
        const jobs = await Job.find({ status: 'APPROVED' })
            .populate('hrId', 'firstName lastName companyName avatar')
            .sort({ updatedAt: -1 })
            .lean();

        res.json({ success: true, data: jobs });
    } catch (error) {
        console.error('List public jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to list jobs.' });
    }
};

export const getJobDetail = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { jobId } = req.params as any;
        const job = await Job.findById(jobId)
            .populate('hrId', 'firstName lastName companyName avatar')
            .lean();
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        // Public access only for APPROVED
        if (job.status !== 'APPROVED') {
            const userId = getAuthUserId(req);
            const role = req.user?.role;
            const isOwner = userId && job.hrId?.toString?.() === userId;
            const isAdmin = role === 'admin';
            if (!isOwner && !isAdmin) {
                res.status(403).json({ success: false, message: 'Access denied.' });
                return;
            }
        }

        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Get job detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to get job.' });
    }
};

export const submitJobForApproval = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const hrId = getAuthUserId(req);
        const { jobId } = req.params as any;

        const job = await Job.findOne({ _id: jobId, hrId });
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        if (job.status !== 'DRAFT') {
            res.status(422).json({ success: false, message: 'Only DRAFT jobs can be submitted.' });
            return;
        }

        const hr = await User.findById(hrId).select('role packageActiveUntil packageTier');
        const activeUntil = (hr as any)?.packageActiveUntil ? new Date((hr as any).packageActiveUntil) : null;
        const isPackageActive = Boolean(activeUntil && activeUntil.getTime() > Date.now());
        if (!isPackageActive) {
            res.status(403).json({ success: false, message: 'Package inactive. Please purchase/activate a package to submit jobs.' });
            return;
        }

        job.status = 'PENDING';
        job.adminReview = undefined;
        await job.save();

        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Submit job error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit job.' });
    }
};

export const listHrJobs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const hrId = getAuthUserId(req);

        const jobs = await Job.find({ hrId })
            .sort({ updatedAt: -1 })
            .lean();

        const jobIds = jobs.map((j) => new mongoose.Types.ObjectId(j._id));

        const counts = await JobApplication.aggregate([
            { $match: { jobId: { $in: jobIds } } },
            {
                $group: {
                    _id: '$jobId',
                    applicants: { $sum: 1 },
                    hired: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['HIRED', 'COMPLETION_PENDING', 'COMPLETED']] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        const countMap = new Map<string, { applicants: number; hired: number }>();
        for (const c of counts) {
            countMap.set(c._id.toString(), { applicants: c.applicants, hired: c.hired });
        }

        const data = jobs.map((j: any) => ({
            ...j,
            applicantsCount: countMap.get(j._id.toString())?.applicants || 0,
            hiredCount: countMap.get(j._id.toString())?.hired || 0,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('List HR jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to list HR jobs.' });
    }
};

