import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FilterQuery } from 'mongoose';
import { Job } from '../../models';
import { error, success } from '../../utils/apiResponse';

type JobStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'FILLED' | 'CLOSED' | 'COMPLETED';

const parsePagination = (req: Request): { page: number; limit: number; skip: number } => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.max(parseInt(String(req.query.limit || '20'), 10), 1);
  return { page, limit, skip: (page - 1) * limit };
};

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? (req.query.status as JobStatus) : undefined;
    const region = typeof req.query.region === 'string' ? req.query.region : undefined;

    const query: FilterQuery<typeof Job> = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'FILLED', 'CLOSED', 'COMPLETED'].includes(status)) {
      query.status = status;
    }

    if (region) {
      query['location.province'] = { $regex: region, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('hrId', 'firstName lastName email companyName')
        .lean(),
      Job.countDocuments(query),
    ]);

    success(res, { data: items, total, page, limit });
  } catch (e) {
    error(res, 'Không thể tải danh sách việc làm', 500, e);
  }
};

export const approveJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user?.userId ?? (req as any).user?._id;
    const update: any = {
      status: 'APPROVED',
      adminReview: {
        reviewedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
        reviewedAt: new Date(),
      },
    };

    const job = await Job.findByIdAndUpdate(req.params.id, update, { new: true }).lean();

    if (!job) {
      error(res, 'Không tìm thấy công việc', 404);
      return;
    }

    console.log(`[ADMIN ACTION] approveJob jobId=${req.params.id}`);
    success(res, job, 'Duyệt công việc thành công');
  } catch (e) {
    error(res, 'Không thể duyệt công việc', 500, e);
  }
};

export const rejectJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body as { reason?: string };

    if (!reason || !reason.trim()) {
      error(res, 'Vui lòng nhập lý do từ chối', 400);
      return;
    }

    const adminId = (req as any).user?.userId ?? (req as any).user?._id;
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      {
        status: 'REJECTED',
        adminReview: {
          reviewedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
          reviewedAt: new Date(),
          reason: reason.trim(),
        },
      },
      { new: true },
    ).lean();

    if (!job) {
      error(res, 'Không tìm thấy công việc', 404);
      return;
    }

    console.log(`[ADMIN ACTION] rejectJob jobId=${req.params.id}`);
    success(res, job, 'Từ chối công việc thành công');
  } catch (e) {
    error(res, 'Không thể từ chối công việc', 500, e);
  }
};
