import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { HrProfile } from '../../models';
import { error, success } from '../../utils/apiResponse';

type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

const parsePagination = (req: Request): { page: number; limit: number; skip: number } => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const limit = Math.max(parseInt(String(req.query.limit || '20'), 10), 1);
  return { page, limit, skip: (page - 1) * limit };
};

export const getHrList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? (req.query.status as VerificationStatus) : undefined;
    const blacklisted = req.query.blacklisted === 'true' ? true : req.query.blacklisted === 'false' ? false : undefined;

    const query: FilterQuery<typeof HrProfile> = {};

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { taxCode: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && ['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
      query.verificationStatus = status;
    }

    if (typeof blacklisted === 'boolean') {
      query.isBlacklisted = blacklisted;
    }

    const [items, total] = await Promise.all([
      HrProfile.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      HrProfile.countDocuments(query),
    ]);

    success(res, { data: items, total, page, limit });
  } catch (e) {
    error(res, 'Không thể tải danh sách HR', 500, e);
  }
};

export const getHrById = async (req: Request, res: Response): Promise<void> => {
  try {
    const hr = await HrProfile.findById(req.params.id).populate('userId', '-passwordHash').lean();

    if (!hr) {
      error(res, 'Không tìm thấy hồ sơ HR', 404);
      return;
    }

    success(res, hr);
  } catch (e) {
    error(res, 'Không thể tải chi tiết HR', 500, e);
  }
};

export const updateHrVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { verificationStatus, reason } = req.body as { verificationStatus?: VerificationStatus; reason?: string };

    if (!verificationStatus || !['PENDING', 'VERIFIED', 'REJECTED'].includes(verificationStatus)) {
      error(res, 'Trạng thái xác minh không hợp lệ', 400);
      return;
    }

    const updateData = {
      verificationStatus,
      ...(reason ? { blacklistReason: reason } : {}),
    };

    const hr = await HrProfile.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

    if (!hr) {
      error(res, 'Không tìm thấy hồ sơ HR', 404);
      return;
    }

    console.log(`[ADMIN ACTION] updateHrVerification hrId=${req.params.id} verificationStatus=${verificationStatus}`);
    success(res, hr, 'Cập nhật trạng thái xác minh HR thành công');
  } catch (e) {
    error(res, 'Không thể cập nhật trạng thái xác minh HR', 500, e);
  }
};

export const updateHrBlacklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { isBlacklisted, reason } = req.body as { isBlacklisted?: boolean; reason?: string };

    if (typeof isBlacklisted !== 'boolean') {
      error(res, 'isBlacklisted phải là kiểu boolean', 400);
      return;
    }

    const hr = await HrProfile.findByIdAndUpdate(
      req.params.id,
      { isBlacklisted, blacklistReason: reason || '' },
      { new: true },
    ).lean();

    if (!hr) {
      error(res, 'Không tìm thấy hồ sơ HR', 404);
      return;
    }

    console.log(`[ADMIN ACTION] updateHrBlacklist hrId=${req.params.id} isBlacklisted=${isBlacklisted}`);
    success(res, hr, 'Cập nhật blacklist HR thành công');
  } catch (e) {
    error(res, 'Không thể cập nhật blacklist HR', 500, e);
  }
};
