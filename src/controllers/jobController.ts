import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Job } from '../models/Job';
import { JobApplication } from '../models/JobApplication';
import { AuthRequest } from '../middlewares/auth';
import { getActiveUserPackage, canPostNewJob, incrementJobUsage } from '../services/packageService';

const getAuthUserId = (req: AuthRequest): string => {
  const rawId =
    (req.user as any)?.userId ??
    (req.user as any)?._id;

  if (typeof rawId === 'string') {
    return rawId;
  }

  return String(rawId);
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

    if (job.status === 'REJECTED') {
      job.status = 'DRAFT';
    }

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
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      res.status(400).json({ success: false, message: 'Invalid jobId.' });
      return;
    }

    const job = await Job.findById(jobId)
      .populate('hrId', 'firstName lastName companyName avatar')
      .lean();
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    if (job.status !== 'APPROVED') {
      const userId = getAuthUserId(req);
      const role = req.user?.role;
      const isOwner = userId && job.hrId?.toString?.() === userId;
      const isAdmin = role === 'ADMIN';
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

    // Dùng UserPackage: khi gói hết hạn đã tự quay về gói Free trong getActiveUserPackage
    const userPackage = await getActiveUserPackage(hrId);
    if (!userPackage) {
      res.status(403).json({ success: false, message: 'Package inactive. Please purchase/activate a package to submit jobs.' });
      return;
    }
    if (!canPostNewJob(userPackage)) {
      res.status(403).json({ success: false, message: 'Đã hết lượt đăng tin trong gói hiện tại. Vui lòng nâng cấp gói.' });
      return;
    }

    job.status = 'PENDING';
    job.adminReview = undefined;
    await job.save();

    await incrementJobUsage(userPackage._id);

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

