import { Request, Response } from 'express';
import { Job } from '../models/Job';

export const listJobs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await Job.find({ status: 'approved' })
      .sort({ priorityLevel: -1, createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách công trình', error: err.message });
  }
};

