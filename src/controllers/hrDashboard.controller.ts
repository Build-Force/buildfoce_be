import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { Job } from '../models/Job';
import { JobApplication } from '../models/JobApplication';

const getAuthUserId = (req: AuthRequest): string => {
  const rawId = (req.user as any)?.userId ?? (req.user as any)?._id;
  return typeof rawId === 'string' ? rawId : String(rawId);
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** GET /api/hr/dashboard - Stats + activity last 7 days for HR */
export const getHrDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hrId = getAuthUserId(req);
    const hrIdObj = new mongoose.Types.ObjectId(hrId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [jobCounts, totalHired, jobsByDay, applicationsByDay] = await Promise.all([
      Job.aggregate([
        { $match: { hrId: hrIdObj } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      JobApplication.countDocuments({
        hrId: hrIdObj,
        status: { $in: ['HIRED', 'COMPLETION_PENDING', 'COMPLETED'] },
      }),
      Job.aggregate([
        {
          $match: {
            hrId: hrIdObj,
            createdAt: { $gte: sevenDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
              d: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      JobApplication.aggregate([
        {
          $match: {
            hrId: hrIdObj,
            createdAt: { $gte: sevenDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: '$createdAt' },
              m: { $month: '$createdAt' },
              d: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of jobCounts) {
      statusCounts[row._id] = row.count;
    }
    const totalJobs =
      (statusCounts.APPROVED || 0) +
      (statusCounts.DRAFT || 0) +
      (statusCounts.PENDING || 0) +
      (statusCounts.REJECTED || 0) +
      (statusCounts.FILLED || 0) +
      (statusCounts.CLOSED || 0) +
      (statusCounts.COMPLETED || 0);
    const activeJobs = statusCounts.APPROVED || 0;
    const closedJobs = (statusCounts.FILLED || 0) + (statusCounts.CLOSED || 0) + (statusCounts.COMPLETED || 0);

    const jobsByDayMap = new Map<string, number>();
    for (const row of jobsByDay) {
      const key = `${row._id.y}-${String(row._id.m).padStart(2, '0')}-${String(row._id.d).padStart(2, '0')}`;
      jobsByDayMap.set(key, row.count);
    }
    const applicationsByDayMap = new Map<string, number>();
    for (const row of applicationsByDay) {
      const key = `${row._id.y}-${String(row._id.m).padStart(2, '0')}-${String(row._id.d).padStart(2, '0')}`;
      applicationsByDayMap.set(key, row.count);
    }

    const activityLast7Days: { date: string; dayLabel: string; jobsCreated: number; applications: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      const dayLabel = DAY_LABELS[dayOfWeek];
      activityLast7Days.push({
        date: dateKey,
        dayLabel,
        jobsCreated: jobsByDayMap.get(dateKey) || 0,
        applications: applicationsByDayMap.get(dateKey) || 0,
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalJobs,
          activeJobs,
          closedJobs,
          totalHired,
        },
        activityLast7Days,
      },
    });
  } catch (error) {
    console.error('HR dashboard error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải dashboard.' });
  }
};
