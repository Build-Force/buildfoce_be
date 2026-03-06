import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { Dispute } from '../../models';
import { error, success } from '../../utils/apiResponse';

type DisputeStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
type DisputePriority = 'LOW' | 'MEDIUM' | 'HIGH';

const parsePagination = (req: Request): { page: number; limit: number; skip: number } => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.max(parseInt(String(req.query.limit || '20'), 10), 1);
  return { page, limit, skip: (page - 1) * limit };
};

export const getDisputes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const status = typeof req.query.status === 'string' ? (req.query.status as DisputeStatus) : undefined;
    const priority = typeof req.query.priority === 'string' ? (req.query.priority as DisputePriority) : undefined;

    const query: FilterQuery<typeof Dispute> = {};

    if (status && ['OPEN', 'INVESTIGATING', 'RESOLVED'].includes(status)) {
      query.status = status;
    }

    if (priority && ['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      query.priority = priority;
    }

    const [items, total] = await Promise.all([
      Dispute.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporterId', '-passwordHash')
        .populate('targetId', '-passwordHash')
        .lean(),
      Dispute.countDocuments(query),
    ]);

    success(res, { data: items, total, page, limit });
  } catch (e) {
    error(res, 'Không thể tải danh sách tranh chấp', 500, e);
  }
};

export const getDisputeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Dispute.findById(req.params.id)
      .populate('reporterId', '-passwordHash')
      .populate('targetId', '-passwordHash')
      .lean();

    if (!item) {
      error(res, 'Không tìm thấy tranh chấp', 404);
      return;
    }

    success(res, item);
  } catch (e) {
    error(res, 'Không thể tải chi tiết tranh chấp', 500, e);
  }
};

export const updateDisputeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body as { status?: DisputeStatus; note?: string };

    if (!status || !['OPEN', 'INVESTIGATING', 'RESOLVED'].includes(status)) {
      error(res, 'Trạng thái tranh chấp không hợp lệ', 400);
      return;
    }

    const item = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: note || '' },
      { new: true },
    ).lean();

    if (!item) {
      error(res, 'Không tìm thấy tranh chấp', 404);
      return;
    }

    console.log(`[ADMIN ACTION] updateDisputeStatus disputeId=${req.params.id} status=${status}`);
    success(res, item, 'Cập nhật trạng thái tranh chấp thành công');
  } catch (e) {
    error(res, 'Không thể cập nhật trạng thái tranh chấp', 500, e);
  }
};
