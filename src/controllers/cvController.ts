import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { WorkerCV } from '../models/WorkerCV';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { JobApplication } from '../models/JobApplication';

const getUserId = (req: AuthRequest): string => {
  const raw = (req.user as any)?.userId ?? (req.user as any)?._id;
  return String(raw);
};

/** GET /api/users/cv - Worker lấy CV của mình */
export const getMyCv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const cv = await WorkerCV.findOne({ userId }).lean() as { content?: any } | null;
    if (!cv?.content) {
      res.json({ success: true, data: null });
      return;
    }
    res.json({ success: true, data: cv.content });
  } catch (err: any) {
    console.error('Get my CV error:', err);
    res.status(500).json({ success: false, message: 'Failed to load CV.' });
  }
};

/** PUT /api/users/cv - Worker lưu/cập nhật CV */
export const upsertMyCv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const role = (req.user as any)?.role;
    // auth middleware attaches role as 'USER' | 'HR' | 'ADMIN'
    if (String(role || '').toUpperCase() !== 'USER') {
      res.status(403).json({ success: false, message: 'Chỉ tài khoản lao động mới có CV.' });
      return;
    }
    const { content } = req.body as { content: any };
    if (!content || typeof content !== 'object') {
      res.status(400).json({ success: false, message: 'content is required (object).' });
      return;
    }
    const cv = await WorkerCV.findOneAndUpdate(
      { userId },
      { $set: { content } },
      { new: true, upsert: true }
    ).lean() as { content?: any } | null;

    // Best-effort sync some CV fields onto User for matching/fallback UI.
    // This does not expose private CV details; it only updates high-level profile fields.
    try {
      const skills = Array.isArray((content as any)?.skills) ? (content as any).skills : undefined;
      const experienceYears = (content as any)?.experienceYears ?? (content as any)?.meta?.experienceYears;
      const preferredLocationCity = (content as any)?.preferredLocationCity ?? (content as any)?.meta?.preferredLocationCity;
      const expectedSalary = (content as any)?.expectedSalary ?? (content as any)?.meta?.expectedSalary;

      const patch: Record<string, unknown> = {};
      if (skills) patch.skills = skills;
      if (experienceYears != null) patch.experienceYears = String(experienceYears);
      if (preferredLocationCity != null) patch.preferredLocationCity = String(preferredLocationCity);
      if (expectedSalary != null) patch.expectedSalary = String(expectedSalary);

      if (Object.keys(patch).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: patch }).lean();
      }
    } catch (syncErr) {
      console.warn('[CV] Failed to sync CV fields onto User:', (syncErr as any)?.message || syncErr);
    }

    res.json({ success: true, data: cv?.content ?? content });
  } catch (err: any) {
    console.error('Upsert CV error:', err);
    res.status(500).json({ success: false, message: 'Failed to save CV.' });
  }
};

/** GET /api/jobs/:jobId/applicants/:applicationId/cv - HR xem CV ứng viên (chỉ khi có đơn ứng tuyển thuộc job của HR) */
export const getApplicantCv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hrId = getUserId(req);
    const { jobId, applicationId } = req.params as { jobId: string; applicationId: string };

    const job = await Job.findById(jobId).select('hrId').lean();
    if (!job || job.hrId?.toString() !== hrId) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    const application = await JobApplication.findOne({
      _id: applicationId,
      jobId,
    }).select('workerId').lean();
    if (!application) {
      res.status(404).json({ success: false, message: 'Ứng viên không tồn tại hoặc không thuộc tin này.' });
      return;
    }

    const workerId = (application as any).workerId;
    const cv = await WorkerCV.findOne({ userId: workerId }).select('content').lean() as { content?: any } | null;
    const user = await User.findById(workerId).select('firstName lastName email phone avatar skills experienceYears preferredLocationCity expectedSalary').lean() as {
      firstName?: string; lastName?: string; email?: string; phone?: string; avatar?: string;
      skills?: string[]; experienceYears?: string; preferredLocationCity?: string; expectedSalary?: string;
    } | null;

    res.json({
      success: true,
      data: {
        cv: cv?.content ?? null,
        worker: user ? {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          skills: user.skills,
          experienceYears: user.experienceYears,
          preferredLocationCity: user.preferredLocationCity,
          expectedSalary: user.expectedSalary,
        } : null,
      },
    });
  } catch (err: any) {
    console.error('Get applicant CV error:', err);
    res.status(500).json({ success: false, message: 'Failed to load CV.' });
  }
};
