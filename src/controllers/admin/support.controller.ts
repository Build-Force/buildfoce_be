import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { SupportTicket } from '../../models';
import { error, success } from '../../utils/apiResponse';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';

const parsePagination = (req: Request): { page: number; limit: number; skip: number } => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.max(parseInt(String(req.query.limit || '20'), 10), 1);
  return { page, limit, skip: (page - 1) * limit };
};

export const getSupportTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const status = typeof req.query.status === 'string' ? (req.query.status as TicketStatus) : undefined;
    const priority = typeof req.query.priority === 'string' ? (req.query.priority as TicketPriority) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const query: FilterQuery<typeof SupportTicket> = {};

    if (status && ['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) {
      query.status = status;
    }

    if (priority && ['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', '-passwordHash')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    success(res, { data: items, total, page, limit });
  } catch (e) {
    error(res, 'Không thể tải danh sách ticket hỗ trợ', 500, e);
  }
};

export const getSupportTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await SupportTicket.findById(req.params.id).populate('userId', '-passwordHash').lean();

    if (!item) {
      error(res, 'Không tìm thấy ticket hỗ trợ', 404);
      return;
    }

    success(res, item);
  } catch (e) {
    error(res, 'Không thể tải chi tiết ticket hỗ trợ', 500, e);
  }
};

export const updateSupportTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, reply } = req.body as { status?: TicketStatus; reply?: string };

    if (!status || !['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) {
      error(res, 'Trạng thái ticket không hợp lệ', 400);
      return;
    }

    const item = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status, adminReply: reply || '' },
      { new: true },
    ).lean();

    if (!item) {
      error(res, 'Không tìm thấy ticket hỗ trợ', 404);
      return;
    }

    console.log(`[ADMIN ACTION] updateSupportTicketStatus ticketId=${req.params.id} status=${status}`);
    success(res, item, 'Cập nhật ticket hỗ trợ thành công');
  } catch (e) {
    error(res, 'Không thể cập nhật ticket hỗ trợ', 500, e);
  }
};
