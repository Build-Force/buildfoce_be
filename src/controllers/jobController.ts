import { Response } from 'express';
import { Job } from '../models/Job';
import { AuthRequest } from '../middlewares/auth';
import { getActiveUserPackage, canPostNewJob, incrementJobUsage } from '../services/packageService';
import mongoose from 'mongoose';

export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    const userId = userPayload?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (userPayload.role !== 'hr') {
      res.status(403).json({ success: false, message: 'Chỉ tài khoản HR mới được đăng tin tuyển dụng.' });
      return;
    }

    const hrObjectId = new mongoose.Types.ObjectId(userId);
    const userPackage = await getActiveUserPackage(hrObjectId);

    if (!userPackage) {
      res.status(403).json({
        success: false,
        code: 'PACKAGE_REQUIRED',
        message: 'Không tìm thấy gói dịch vụ phù hợp. Vui lòng liên hệ admin.',
      });
      return;
    }

    if (!canPostNewJob(userPackage)) {
      res.status(403).json({
        success: false,
        code: 'PACKAGE_QUOTA_EXCEEDED',
        message: 'Gói hiện tại đã hết lượt đăng tin. Vui lòng nâng cấp gói để đăng thêm.',
      });
      return;
    }

    const {
      title,
      description,
      requirements,
      jobType,
      workers,
      province,
      address,
      salary,
      salaryType,
      startDate,
      endDate,
    } = req.body;

    if (!title || !province || !salary) {
      res.status(400).json({
        success: false,
        message: 'Tiêu đề, tỉnh/thành phố và mức lương là bắt buộc.',
      });
      return;
    }

    const job = new Job({
      hrId: hrObjectId,
      title,
      description,
      requirements,
      jobType: jobType || 'day',
      workers: workers || 1,
      province,
      address,
      salary,
      salaryType: salaryType || 'day',
      startDate,
      endDate,
      status: 'pending_approval',
      priorityLevel: userPackage.priorityLevel,
      hrPackageName: userPackage.packageName,
    });

    await job.save();
    await incrementJobUsage(userPackage._id);

    res.status(201).json({
      success: true,
      message: 'Tạo tin tuyển dụng thành công. Vui lòng chờ admin duyệt.',
      data: job,
    });
  } catch (err: any) {
    console.error('Create job error:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo tin tuyển dụng', error: err.message });
  }
};

