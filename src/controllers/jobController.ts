import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Job } from '../models/Job';
import { JobApplication } from '../models/JobApplication';
import { HrProfile } from '../models/HrProfile';
import { AuthRequest } from '../middlewares/auth';
import { getMatchedJobsForEmployee, getMatchedWorkersForJob } from '../services/matchService';
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
      images,
      minExperienceYears,
      verificationRequired,
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
      images: Array.isArray(images) ? images : [],
      minExperienceYears,
      verificationRequired: Boolean(verificationRequired),
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

    const allowed = ['title', 'description', 'requirements', 'skills', 'location', 'salary', 'workersNeeded', 'startDate', 'endDate', 'images', 'minExperienceYears', 'verificationRequired'];
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

/** HR đóng tin tuyển dụng (DRAFT/PENDING/APPROVED/REJECTED → CLOSED). */
export const closeJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hrId = getAuthUserId(req);
    const { jobId } = req.params as any;

    const job = await Job.findOne({ _id: jobId, hrId });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    if (['CLOSED', 'FILLED', 'COMPLETED'].includes(job.status)) {
      res.status(422).json({ success: false, message: 'Tin đã đóng hoặc hoàn thành.' });
      return;
    }

    job.status = 'CLOSED';
    await job.save();
    res.json({ success: true, data: job, message: 'Đã đóng tin tuyển dụng.' });
  } catch (error) {
    console.error('Close job error:', error);
    res.status(500).json({ success: false, message: 'Failed to close job.' });
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

/** Auto Match (Tier 1): jobs that pass all 5 rule-based criteria for the current employee. */
export const listMatchedJobsForEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const role = (req.user as any)?.role;
        if (role !== 'USER') {
            res.status(403).json({ success: false, message: 'Chỉ dành cho tài khoản lao động.' });
            return;
        }

        const results = await getMatchedJobsForEmployee(userId);
        const data = results.map((r) => ({
            ...r.job,
            matchScore: r.matchScore,
            matchDetails: r.matchDetails,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('List matched jobs error:', error);
        res.status(500).json({ success: false, message: 'Failed to get matched jobs.' });
    }
};

/** Auto Match (HR): workers that pass all 5 criteria for this job. Only job owner or admin. */
export const listMatchedWorkersForJob = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { jobId } = req.params as any;
        const userId = getAuthUserId(req);
        const role = (req.user as any)?.role;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            res.status(400).json({ success: false, message: 'Invalid jobId.' });
            return;
        }

        const job = await Job.findById(jobId).select('hrId status').lean();
        if (!job) {
            res.status(404).json({ success: false, message: 'Job not found.' });
            return;
        }
        const isOwner = job.hrId?.toString() === userId;
        const isAdmin = role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            res.status(403).json({ success: false, message: 'Chỉ chủ tin hoặc Admin mới xem được ứng viên phù hợp.' });
            return;
        }

        const data = await getMatchedWorkersForJob(jobId);
        res.json({ success: true, data });
    } catch (error) {
        console.error('List matched workers error:', error);
        res.status(500).json({ success: false, message: 'Failed to get matched workers.' });
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
      const hrIdVal = (job.hrId as any)?._id ?? job.hrId;
      const isOwner = userId && String(hrIdVal) === userId;
      const isAdmin = role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
    }

    const hrUserId = (job.hrId as any)?._id ?? job.hrId;
    if (hrUserId) {
      const hrProfile = await HrProfile.findOne({ userId: hrUserId }).select('averageRating').lean() as { averageRating?: number } | null;
      if (hrProfile && job.hrId && typeof job.hrId === 'object') {
        (job as any).hrId = { ...(job.hrId as object), averageRating: hrProfile.averageRating };
      }
    }

    const userId = (req as any).user ? getAuthUserId(req) : null;
    if (userId && String(hrUserId) !== userId) {
      const myApp = await JobApplication.findOne(
        { jobId: job._id, workerId: userId },
        'status decisionReason appliedAt'
      ).lean();
      if (myApp) {
        (job as any).myApplication = {
          _id: myApp._id,
          status: myApp.status,
          decisionReason: myApp.decisionReason,
          appliedAt: myApp.appliedAt,
        };
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

