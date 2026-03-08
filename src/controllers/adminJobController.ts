import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { Job } from '../models/Job';

const getAuthUserId = (req: Request): string => {
    const user = (req as AuthRequest).user;
    const rawId = user?.userId ?? (user as any)?._id;

    if (typeof rawId === 'string') {
        return rawId;
    }

    return String(rawId);
};

export const listPendingJobs = async (_req: Request, res: Response): Promise<void> => {
    try {
        const jobs = await Job.find({ status: 'PENDING' })
            .sort({ createdAt: -1 })
            .populate('hrId', 'firstName lastName email phone companyName')
            .lean();

        res.json({ success: true, data: jobs });
    } catch (error) {
        console.error('List pending jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to list pending jobs.' });
    }
};

export const approveJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = getAuthUserId(req);
        const { jobId } = req.params as any;

        const job = await Job.findById(jobId);
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        if (job.status !== 'PENDING') {
            res.status(422).json({ success: false, message: 'Only PENDING jobs can be approved.' });
            return;
        }

        job.status = 'APPROVED';
        job.adminReview = {
            reviewedBy: new mongoose.Types.ObjectId(adminId),
            reviewedAt: new Date(),
        };
        await job.save();

        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Approve job error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve job.' });
    }
};

export const rejectJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = getAuthUserId(req);
        const { jobId } = req.params as any;
        const { reason } = req.body as any;

        const job = await Job.findById(jobId);
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        if (job.status !== 'PENDING') {
            res.status(422).json({ success: false, message: 'Only PENDING jobs can be rejected.' });
            return;
        }

        job.status = 'REJECTED';
        job.adminReview = {
            reviewedBy: new mongoose.Types.ObjectId(adminId),
            reviewedAt: new Date(),
            reason: typeof reason === 'string' ? reason.trim() : undefined,
        };
        await job.save();

        res.json({ success: true, data: job });
    } catch (error) {
        console.error('Reject job error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject job.' });
    }
};

