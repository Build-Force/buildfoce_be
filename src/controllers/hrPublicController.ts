import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { HrProfile } from '../models/HrProfile';
import { Job } from '../models/Job';
import { Review } from '../models/Review';

export const listPublicContractors = async (_req: Request, res: Response): Promise<void> => {
    try {
        const hrProfiles = await HrProfile.find({ isBlacklisted: false })
            .populate('userId', 'firstName lastName companyName avatar createdAt isVerified')
            .sort({ averageRating: -1, totalJobsCompleted: -1 })
            .limit(10)
            .lean() as any[];

        const mapped = hrProfiles.map(hr => {
            const user = hr.userId || {};
            const iconOptions = ["business", "apartment", "domain", "factory", "location_city"];
            const icon = iconOptions[Math.floor(Math.random() * iconOptions.length)];
            return {
                id: user._id,
                name: hr.companyName || user.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Nhà tuyển dụng',
                verifiedSince: user.createdAt ? new Date(user.createdAt).getFullYear().toString() : '2023',
                projectsCount: hr.totalJobsCompleted || 0,
                rating: hr.averageRating ? hr.averageRating.toFixed(1) : 5.0,
                reliability: hr.onTimePaymentRate >= 90 ? 'Rất cao' : hr.onTimePaymentRate >= 70 ? 'Cao' : 'Trung bình',
                icon,
                logo: user.avatar
            };
        });

        res.json({ success: true, data: mapped });
    } catch (error) {
        console.error('listPublicContractors error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getHrProfileById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid HR ID' });
            return;
        }

        const hrIdObj = new mongoose.Types.ObjectId(id);

        const user = await User.findOne({ _id: hrIdObj, role: 'hr' })
            .select('firstName lastName companyName avatar profileDocumentImages email phone address createdAt isVerified isVerifiedPhone isVerifiedCccd portfolios experienceYears')
            .lean() as any;

        if (!user) {
            res.status(404).json({ success: false, message: 'HR Profile not found' });
            return;
        }

        const hrProfile = await HrProfile.findOne({ userId: hrIdObj }).lean() as any;

        // Stats
        const jobs = await Job.find({ hrId: hrIdObj }).select('status createdAt').lean() as any[];
        let totalProjects = jobs.length;
        let completedProjects = jobs.filter(j => j.status === 'COMPLETED').length;
        let cancelledProjects = jobs.filter(j => j.status === 'CLOSED' || j.status === 'REJECTED').length;
        let ongoingProjects = jobs.filter(j => j.status === 'APPROVED' || j.status === 'FILLED').length;

        // Reviews - Parse dimensions from sub-ratings if they exist, else default safely using general rating
        const reviews = await Review.find({ targetId: hrIdObj }).populate('reviewerId', 'firstName lastName avatar createdAt').populate('jobId', 'title params').lean() as any[];
        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0 ? reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / totalReviews : 0;

        let breakdown = { payment: 0, communication: 0, environment: 0, transparency: 0 };
        if (totalReviews > 0) {
            reviews.forEach(r => {
                breakdown.payment += r.ratings?.payment || r.rating || 0;
                breakdown.communication += r.ratings?.communication || r.rating || 0;
                breakdown.environment += r.ratings?.environment || r.rating || 0;
                breakdown.transparency += r.ratings?.transparency || r.rating || 0;
            });
            breakdown.payment = Math.round((breakdown.payment / totalReviews) * 10) / 10;
            breakdown.communication = Math.round((breakdown.communication / totalReviews) * 10) / 10;
            breakdown.environment = Math.round((breakdown.environment / totalReviews) * 10) / 10;
            breakdown.transparency = Math.round((breakdown.transparency / totalReviews) * 10) / 10;
        }

        // Active Jobs
        const activeJobs = await Job.find({ hrId: hrIdObj, status: 'APPROVED' })
            .select('title metadata.location.province salary.min salary.max params.skills endDate image images')
            .limit(5).lean() as any[];

        // Historical Projects (Completed or Ongoing but not currently hiring)
        const historicalProjects = await Job.find({ hrId: hrIdObj, status: { $in: ['COMPLETED', 'CLOSED', 'FILLED'] } })
            .select('title location status createdAt endDate workersHired workersNeeded images')
            .limit(20).lean() as any[];

        const mappedProjects = historicalProjects.map(p => ({
            id: p._id,
            name: p.title,
            district: p.location?.city || p.location?.address || "Trung tâm",
            city: p.location?.province || "Việt Nam",
            startDate: new Date(p.createdAt).toLocaleDateString('vi-VN'),
            endDate: p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : "Chưa rõ",
            status: p.status === 'COMPLETED' ? 'completed' : p.status === 'CLOSED' ? 'cancelled' : 'ongoing',
            workerTypes: [{ type: "Lao động", count: p.workersHired || p.workersNeeded || 0 }],
            paymentStatus: 'on_time',
            image: p.images?.[0] || null,
        }));

        // Generate 12 months array for payment history padding securely without hardcoding just strings
        const paymentHistory = Array(12).fill("no_data");
        const currentMonth = new Date().getMonth();

        // Loop over completed projects to assign 'on_time' activity into the timeline based on their endDate/createdAt
        historicalProjects.forEach(proj => {
            if (proj.status === 'COMPLETED' && proj.endDate) {
                const projMonth = new Date(proj.endDate).getMonth();
                const diff = currentMonth >= projMonth ? currentMonth - projMonth : 12 - (projMonth - currentMonth);
                if (diff >= 0 && diff < 12) {
                    paymentHistory[11 - diff] = "on_time";
                }
            }
        });

        // Also check for jobs completed in recent months (by createdAt if no endDate)
        historicalProjects.forEach(proj => {
            if (proj.status === 'COMPLETED' && !proj.endDate && proj.createdAt) {
                const projMonth = new Date(proj.createdAt).getMonth();
                const diff = currentMonth >= projMonth ? currentMonth - projMonth : 12 - (projMonth - currentMonth);
                if (diff >= 0 && diff < 12) {
                    if (paymentHistory[11 - diff] === 'no_data') paymentHistory[11 - diff] = "on_time";
                }
            }
        });

        res.json({
            success: true,
            data: {
                id: user._id,
                name: (user.companyName && user.companyName !== 'Default Company')
                    ? user.companyName
                    : `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Nhà tuyển dụng',
                logo: user.avatar,
                profileDocumentImages: user.profileDocumentImages || [],
                initials: user.companyName ? user.companyName.substring(0, 2).toUpperCase() : 'HR',
                verified: user.isVerified || false,
                verifiedMST: user.isVerified,
                verifiedAddress: false,
                joinedDate: user.createdAt,
                location: (user as any).address || hrProfile?.companyAddress || "Chưa cập nhật",
                industryType: hrProfile?.industry || "Tuyển dụng",
                experienceYears: user.experienceYears,
                description: hrProfile?.description || "Chưa cập nhật mô tả.",
                portfolios: (user.portfolios && user.portfolios.length > 0)
                    ? user.portfolios
                    : historicalProjects.map((p: any) => ({
                        title: p.title,
                        description: `${p.location?.province || 'Việt Nam'} — ${p.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã thực hiện'}`,
                        image: (p.images && p.images.length > 0) ? p.images[0] : 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?q=80&w=800',
                    })),


                stats: {
                    totalProjects,
                    completedProjects,
                    cancelledProjects,
                    ongoingProjects,
                    totalWorkers: historicalProjects.reduce((acc, p) => acc + (p.workersHired || p.workersNeeded || 0), 0),
                    completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 100,
                    avgRating: Math.round(avgRating * 10) / 10,
                    totalReviews,
                    onTimePaymentRate: paymentHistory.some(p => p !== 'no_data') ? 100 : 0,
                },
                paymentHistory,
                badges: ["verified_mst", "payment_good"],
                ratingBreakdown: breakdown,
                projects: mappedProjects,
                reviews: reviews.map((r: any) => {
                    const jobTitle = r.jobId?.title || "Dự án đã từng tham gia";
                    let workerSkill = "Lao động tự do";
                    if (r.jobId?.params?.skills && r.jobId.params.skills.length > 0) {
                        workerSkill = r.jobId.params.skills[0]; // pick first skill as workerType
                    }
                    return {
                        id: r._id,
                        workerType: workerSkill,
                        projectName: jobTitle,
                        date: new Date(r.createdAt).toLocaleDateString('vi-VN'),
                        rating: r.rating,
                        content: r.comment || "Không có nội dung đánh giá",
                        reviewer: r.reviewerId
                    };
                }),
                activeJobs: activeJobs.map(j => ({
                    _id: j._id,
                    title: j.title,
                    locationName: (j.metadata as any)?.location?.province || "Việt Nam",
                    salaryMin: (j.salary as any)?.min || 0,
                    salaryMax: (j.salary as any)?.max || 0,
                    status: "Active",
                    expiresAt: (j as any).endDate,
                    image: j.image || (j.images && j.images.length > 0 ? j.images[0] : null)
                })),
                warnings: []
            }
        });
    } catch (error) {
        console.error('getHrProfileById error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
