import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { User } from '../../models';
import { error, success } from '../../utils/apiResponse';

type UserRole = 'USER' | 'HR' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

const parsePagination = (req: Request): { page: number; limit: number; skip: number } => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.max(parseInt(String(req.query.limit || '20'), 10), 1);
  return { page, limit, skip: (page - 1) * limit };
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? (req.query.role as UserRole) : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as UserStatus) : undefined;

    const query: FilterQuery<typeof User> = {};

    if (search) {
      query.$or = [{ email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    }

    if (role && ['USER', 'HR', 'ADMIN'].includes(role)) {
      query.role = role;
    }

    if (status && ['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
      query.status = status;
    }

    const [users, total] = await Promise.all([
      User.find(query, { passwordHash: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    success(res, { data: users, total, page, limit });
  } catch (e) {
    error(res, 'Không thể tải danh sách người dùng', 500, e);
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id, { passwordHash: 0 }).lean();

    if (!user) {
      error(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    success(res, user);
  } catch (e) {
    error(res, 'Không thể tải chi tiết người dùng', 500, e);
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status?: UserStatus };

    if (!status || !['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
      error(res, 'Trạng thái không hợp lệ', 400);
      return;
    }

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true, projection: { passwordHash: 0 } }).lean();

    if (!user) {
      error(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    console.log(`[ADMIN ACTION] updateUserStatus userId=${req.params.id} status=${status}`);
    success(res, user, 'Cập nhật trạng thái người dùng thành công');
  } catch (e) {
    error(res, 'Không thể cập nhật trạng thái người dùng', 500, e);
  }
};
