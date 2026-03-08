import { Request, Response } from 'express';
import { Dispute, HrProfile, Job, SupportTicket, User } from '../../models';
import { error, success } from '../../utils/apiResponse';

const getRangeDays = (range?: string): number => {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  return 30;
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = typeof req.query.range === 'string' ? req.query.range : '30d';
    const rangeDays = getRangeDays(range);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - rangeDays);

    const [totalUsers, totalHr, openJobs, pendingApprovals, disputesOpen] = await Promise.all([
      User.countDocuments(),
      HrProfile.countDocuments(),
      Job.countDocuments({ status: 'APPROVED' }),
      Job.countDocuments({ status: 'PENDING' }),
      Dispute.countDocuments({ status: 'OPEN' }),
    ]);

    const jobGrowth = await Job.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const hrRegistrations = await HrProfile.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const [latestUsers, latestJobs, latestDisputes, latestTickets] = await Promise.all([
      User.find({}, { passwordHash: 0 }).sort({ updatedAt: -1 }).limit(3).lean(),
      Job.find().sort({ updatedAt: -1 }).limit(3).lean(),
      Dispute.find().sort({ updatedAt: -1 }).limit(2).lean(),
      SupportTicket.find().sort({ updatedAt: -1 }).limit(2).lean(),
    ]);

    const recentActivities = [
      ...latestUsers.map((item) => ({ type: 'USER', action: 'UPDATED', timestamp: item.updatedAt, data: item })),
      ...latestJobs.map((item) => ({ type: 'JOB', action: 'UPDATED', timestamp: item.updatedAt, data: item })),
      ...latestDisputes.map((item) => ({ type: 'DISPUTE', action: 'UPDATED', timestamp: item.updatedAt, data: item })),
      ...latestTickets.map((item) => ({ type: 'SUPPORT', action: 'UPDATED', timestamp: item.updatedAt, data: item })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    success(res, {
      range,
      stats: {
        totalUsers,
        totalHr,
        openJobs,
        pendingApprovals,
        disputes: disputesOpen,
      },
      jobGrowth,
      hrRegistrations,
      recentActivities,
    });
  } catch (e) {
    error(res, 'Không thể tải dữ liệu dashboard', 500, e);
  }
};

export const exportDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = typeof req.query.range === 'string' ? req.query.range : '30d';
    const format = typeof req.query.format === 'string' ? req.query.format : 'csv';

    if (format !== 'csv') {
      error(res, 'Hiện chỉ hỗ trợ export CSV', 400);
      return;
    }

    const csvContent = ['range,generatedAt', `${range},${new Date().toISOString()}`].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="admin-dashboard-${range}.csv"`);
    res.status(200).send(csvContent);
  } catch (e) {
    error(res, 'Không thể export dashboard', 500, e);
  }
};
