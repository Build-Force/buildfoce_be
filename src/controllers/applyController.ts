import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { Job } from '../models/Job';
import { JobApplication } from '../models/JobApplication';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { sendApplicationAcceptedEmail, sendApplicationRejectedEmail } from '../utils/email';

const getAuthUserId = (req: AuthRequest): string => {
    const rawId =
        (req.user as any)?.userId ??
        (req.user as any)?._id;

    if (typeof rawId === 'string') {
        return rawId;
    }

    return String(rawId);
};

export const applyToJob = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const workerId = getAuthUserId(req);
        const { jobId } = req.params as any;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            res.status(400).json({ success: false, message: 'Invalid jobId.' });
            return;
        }

        const job = await Job.findById(jobId);
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        if (job.status !== 'APPROVED') {
            res.status(422).json({ success: false, message: 'Job is not available for applying.' });
            return;
        }

        if (job.workersHired >= job.workersNeeded) {
            res.status(409).json({ success: false, message: 'Job is already filled or closed.' });
            return;
        }

        try {
            const application = await JobApplication.create({
                jobId: job._id,
                workerId,
                hrId: job.hrId,
                status: 'APPLIED',
                appliedAt: new Date(),
            });

            res.status(201).json({ success: true, data: application });
        } catch (err: any) {
            if (err?.code === 11000) {
                res.status(409).json({ success: false, message: 'You have already applied to this job.' });
                return;
            }
            throw err;
        }
    } catch (error) {
        console.error('Apply to job error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply to job.' });
    }
};

export const listApplicantsForJob = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const hrId = getAuthUserId(req);
        const { jobId } = req.params as any;

        const job = await Job.findById(jobId).lean();
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        if (job.hrId?.toString?.() !== hrId) {
            res.status(403).json({ success: false, message: 'Access denied.' });
            return;
        }

        const applications = await JobApplication.find({ jobId })
            .populate('workerId', 'firstName lastName avatar role skills experienceYears preferredLocationCity expectedSalary')
            .sort({ appliedAt: -1 })
            .lean();

        const applicationIds = applications.map((a) => a._id);
        const reviewedAppIds = new Set(
            (await Review.find({ applicationId: { $in: applicationIds }, reviewerId: hrId }).select('applicationId').lean()).map((r) => r.applicationId.toString())
        );
        const hrReviews = await Review.find({ applicationId: { $in: applicationIds }, reviewerRole: 'HR' }).select('applicationId rating').lean();
        const ratingByAppId: Record<string, number> = {};
        hrReviews.forEach((r: any) => {
            const num = Number(r.rating);
            if (!Number.isNaN(num)) ratingByAppId[r.applicationId.toString()] = num;
        });

        const data = applications.map((app) => ({
            ...app,
            hasHrReviewed: reviewedAppIds.has(app._id.toString()),
            workerRating: ratingByAppId[app._id.toString()] ?? null,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('List applicants error:', error);
        res.status(500).json({ success: false, message: 'Failed to list applicants.' });
    }
};

/** GET /hr/workers - List all hired workers for current HR (status HIRED, COMPLETION_PENDING, COMPLETED) with rating */
export const listHiredWorkers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const hrId = getAuthUserId(req);
        const applications = await JobApplication.find({
            hrId,
            status: { $in: ['HIRED', 'COMPLETION_PENDING', 'COMPLETED'] },
        })
            .populate('jobId', 'title startDate endDate')
            .populate('workerId', 'firstName lastName')
            .sort({ updatedAt: -1 })
            .lean();

        const applicationIds = applications.map((a) => a._id);
        const hrReviews = await Review.find({ applicationId: { $in: applicationIds }, reviewerRole: 'HR' }).select('applicationId rating').lean();
        const ratingByAppId: Record<string, number> = {};
        hrReviews.forEach((r: any) => {
            const num = Number(r.rating);
            if (!Number.isNaN(num)) ratingByAppId[r.applicationId.toString()] = num;
        });

        const data = applications.map((app: any) => ({
            id: app._id,
            jobId: app.jobId?._id,
            jobTitle: app.jobId?.title || '—',
            startDate: app.jobId?.startDate,
            endDate: app.jobId?.endDate,
            workerId: app.workerId?._id,
            workerName: app.workerId ? [app.workerId.firstName, app.workerId.lastName].filter(Boolean).join(' ') : '—',
            status: app.status,
            rating: ratingByAppId[app._id.toString()] ?? null,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('List hired workers error:', error);
        res.status(500).json({ success: false, message: 'Failed to list hired workers.' });
    }
};

export const updateApplicantStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const hrId = getAuthUserId(req);
        const { jobId, applicationId } = req.params as any;
        const { action, reason } = req.body as any;

        const job = await Job.findById(jobId).lean();
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }

        if (job.hrId?.toString?.() !== hrId) {
            res.status(403).json({ success: false, message: 'Access denied.' });
            return;
        }

        const application = await JobApplication.findOne({ _id: applicationId, jobId });
        if (!application) {
            res.status(404).json({ success: false, message: 'Application not found.' });
            return;
        }

        if (application.status !== 'APPLIED') {
            res.status(422).json({ success: false, message: 'Application cannot be updated in current status.' });
            return;
        }

        if (action === 'accept') {
            application.status = 'ACCEPTED';
        } else if (action === 'reject') {
            application.status = 'REJECTED';
        }

        application.decidedAt = new Date();
        if (reason && typeof reason === 'string') {
            application.decisionReason = reason.trim();
        }

        await application.save();

        const jobTitle = (job as any).title || 'Công việc';
        const workerUser = await User.findById(application.workerId).select('email').lean() as { email?: string } | null;
        const workerEmail = workerUser?.email;
        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL;

        if (workerEmail) {
            try {
                if (action === 'accept') {
                    await sendApplicationAcceptedEmail(workerEmail, jobTitle, frontendUrl);
                } else if (action === 'reject') {
                    await sendApplicationRejectedEmail(workerEmail, jobTitle, application.decisionReason || undefined);
                }
            } catch (emailErr) {
                console.error('Failed to send application status email to worker:', emailErr);
            }
        } else {
            console.warn('[APPLY] Worker has no email; skipping application status notification.');
        }

        res.json({ success: true, data: application });
    } catch (error) {
        console.error('Update applicant status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update applicant status.' });
    }
};

export const confirmHire = async (req: AuthRequest, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    try {
        const hrId = getAuthUserId(req);
        const { jobId, applicationId } = req.params as any;

        let updatedApplication: any = null;
        let updatedJob: any = null;

        await session.withTransaction(async () => {
            const job = await Job.findById(jobId).session(session);
            if (!job) {
                throw Object.assign(new Error('Job not found'), { httpStatus: 404 });
            }

            if (job.hrId.toString() !== hrId) {
                throw Object.assign(new Error('Access denied'), { httpStatus: 403 });
            }

            const application = await JobApplication.findOne({ _id: applicationId, jobId }).session(session);
            if (!application) {
                throw Object.assign(new Error('Application not found'), { httpStatus: 404 });
            }

            if (application.status !== 'ACCEPTED') {
                throw Object.assign(new Error('Only ACCEPTED applications can be confirmed for hire'), { httpStatus: 422 });
            }

            if (job.workersHired >= job.workersNeeded) {
                throw Object.assign(new Error('Job is already filled'), { httpStatus: 409 });
            }

            application.status = 'HIRED';
            application.hireConfirmedAt = new Date();
            await application.save({ session });

            job.workersHired += 1;
            if (job.workersHired >= job.workersNeeded) {
                job.status = 'FILLED';
            }
            await job.save({ session });

            updatedApplication = application.toObject();
            updatedJob = job.toObject();
        });

        res.json({ success: true, data: { application: updatedApplication, job: updatedJob } });
    } catch (error: any) {
        const status = error?.httpStatus || 500;
        const message = status === 500 ? 'Failed to confirm hire.' : error.message;
        console.error('Confirm hire error:', error);
        res.status(status).json({ success: false, message });
    } finally {
        session.endSession();
    }
};

export const confirmComplete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const role = req.user?.role;
        const { jobId, applicationId } = req.params as any;

        const application = await JobApplication.findOne({ _id: applicationId, jobId });
        if (!application) {
            res.status(404).json({ success: false, message: 'Application not found.' });
            return;
        }

        const isWorker = application.workerId.toString() === userId;
        const isHr = application.hrId.toString() === userId;
        const isAdmin = role === 'ADMIN';
        if (!isWorker && !isHr && !isAdmin) {
            res.status(403).json({ success: false, message: 'Access denied.' });
            return;
        }

        if (!['HIRED', 'COMPLETION_PENDING', 'COMPLETED'].includes(application.status)) {
            res.status(422).json({ success: false, message: 'Completion cannot be confirmed in current status.' });
            return;
        }

        if (!application.completion) application.completion = {};
        if (isWorker && !application.completion.workerConfirmedAt) {
            application.completion.workerConfirmedAt = new Date();
        }
        if (isHr && !application.completion.hrConfirmedAt) {
            application.completion.hrConfirmedAt = new Date();
        }

        const hasBoth = Boolean(application.completion.workerConfirmedAt && application.completion.hrConfirmedAt);
        if (hasBoth) {
            application.status = 'COMPLETED';
        } else {
            application.status = 'COMPLETION_PENDING';
        }

        await application.save();

        if (hasBoth) {
            const remaining = await JobApplication.countDocuments({
                jobId,
                status: { $in: ['HIRED', 'COMPLETION_PENDING'] },
            });
            if (remaining === 0) {
                await Job.findByIdAndUpdate(jobId, { status: 'COMPLETED' });
            }
        }

        res.json({ success: true, data: application });
    } catch (error) {
        console.error('Confirm complete error:', error);
        res.status(500).json({ success: false, message: 'Failed to confirm completion.' });
    }
};

