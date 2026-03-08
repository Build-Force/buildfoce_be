import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FilterQuery } from 'mongoose';
import { Job, User } from '../../models';
import { error, success } from '../../utils/apiResponse';
import { AuthRequest } from '../../middlewares/auth';
import { sendJobApprovedEmail, sendJobRejectedEmail } from '../../utils/email';
import { env } from '../../config/env';

const parsePagination = (req: Request): { page: number; limit: number; skip: number } => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.max(parseInt(String(req.query.limit || '20'), 10), 1);
  return { page, limit, skip: (page - 1) * limit };
};

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    let status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const region = typeof req.query.region === 'string' ? req.query.region.trim() : undefined;

    const query: FilterQuery<typeof Job> = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      if (status === 'PENDING_APPROVAL') status = 'PENDING';
      if (['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'FILLED', 'CLOSED', 'COMPLETED'].includes(status)) {
        query.status = status;
      }
    }

    if (region) {
      query['location.province'] = { $regex: region, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('hrId', 'firstName lastName companyName')
        .lean(),
      Job.countDocuments(query),
    ]);

    success(res, { data: items, total, page, limit });
  } catch (e) {
    error(res, 'Không thể tải danh sách việc làm', 500, e);
  }
};

export const approveJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);

    if (!job) {
      error(res, 'Không tìm thấy công việc', 404);
      return;
    }

    if (job.status !== 'PENDING') {
      error(res, 'Chỉ tin đang chờ duyệt (PENDING) mới được duyệt.', 422);
      return;
    }

    const adminId = (req.user as any)?.userId ?? (req.user as any)?._id;
    job.status = 'APPROVED';
    job.adminReview = {
      reviewedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      reviewedAt: new Date(),
    };
    await job.save();

    try {
      const hrId = typeof job.hrId === 'object' && job.hrId && '_id' in (job.hrId as object)
        ? (job.hrId as { _id: mongoose.Types.ObjectId })._id
        : job.hrId;
      const hrUser = await User.findById(hrId).select('email').lean() as { email?: string } | null;
      if (hrUser?.email) {
        await sendJobApprovedEmail(hrUser.email, job.title, env.FRONTEND_URL);
        console.log(`[ADMIN] 📧 Đã gửi email thông báo duyệt tin tới HR: ${hrUser.email}`);
      } else {
        console.warn(`[ADMIN] ⚠️ Không gửi được email: HR (jobId=${jobId}) chưa có email trong hệ thống.`);
      }
    } catch (emailErr) {
      console.error('[ADMIN] Failed to send job approved email to HR:', emailErr);
    }

    console.log(`[ADMIN ACTION] approveJob jobId=${jobId}`);
    success(res, job.toObject(), 'Duyệt công việc thành công');
  } catch (e) {
    error(res, 'Không thể duyệt công việc', 500, e);
  }
};

export const rejectJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body as { reason?: string };

    if (!reason || !reason.trim()) {
      error(res, 'Vui lòng nhập lý do từ chối', 400);
      return;
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      error(res, 'Không tìm thấy công việc', 404);
      return;
    }

    if (job.status !== 'PENDING') {
      error(res, 'Chỉ tin đang chờ duyệt (PENDING) mới được từ chối.', 422);
      return;
    }

    const adminId = (req.user as any)?.userId ?? (req.user as any)?._id;
    job.status = 'REJECTED';
    job.adminReview = {
      reviewedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      reviewedAt: new Date(),
      reason: reason.trim(),
    };
    await job.save();

    const reasonTrimmed = reason.trim();
    try {
      const hrId = typeof job.hrId === 'object' && job.hrId && '_id' in (job.hrId as object)
        ? (job.hrId as { _id: mongoose.Types.ObjectId })._id
        : job.hrId;
      const hrUser = await User.findById(hrId).select('email').lean() as { email?: string } | null;
      if (hrUser?.email) {
        await sendJobRejectedEmail(hrUser.email, job.title, reasonTrimmed);
        console.log(`[ADMIN] 📧 Đã gửi email thông báo từ chối tin tới HR: ${hrUser.email}`);
      } else {
        console.warn(`[ADMIN] ⚠️ Không gửi được email: HR (jobId=${req.params.id}) chưa có email trong hệ thống.`);
      }
    } catch (emailErr) {
      console.error('[ADMIN] Failed to send job rejected email to HR:', emailErr);
    }

    console.log(`[ADMIN ACTION] rejectJob jobId=${req.params.id}`);
    success(res, job.toObject(), 'Từ chối công việc thành công');
  } catch (e) {
    error(res, 'Không thể từ chối công việc', 500, e);
  }
};
