import { Request, Response } from 'express';
import { SurveyAnswer } from '../models/SurveyAnswer';
import { User } from '../models/User';
import { getMatchedJobsForEmployee } from '../services/matchService';

export const submitSurvey = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        const body = req.body;
        // Hỗ trợ cả format cũ (primaryTrade...) và format từ wizard (trade, tradeCustom, experience, location_pref)
        const primaryTrade = body.primaryTrade ?? (body.trade === 'other' && body.tradeCustom
            ? String(body.tradeCustom).trim()
            : body.trade);
        const skills = body.skills ?? (body.trade && body.trade !== 'other' ? [body.trade] : []);
        const experienceYears = body.experienceYears ?? body.experience ?? '';
        const availability = body.availability ?? '';
        const preferredLocation = body.preferredLocation ?? {
            city: 'Không xác định',
            radius: body.location_pref === 'national' ? 999 : body.location_pref === 'regional' ? 50 : 10
        };
        const expectedSalary = body.expectedSalary ?? 'Thương lượng';

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const surveyAnswer = new SurveyAnswer({
            userId,
            primaryTrade: primaryTrade || 'general',
            skills,
            experienceYears,
            preferredLocation,
            expectedSalary,
            availability
        });

        await surveyAnswer.save();

        // Update User profile with survey data (Auto-complete profile)
        await User.findByIdAndUpdate(userId, {
            $set: {
                skills,
                experienceYears,
                preferredLocationCity: preferredLocation?.city,
                expectedSalary
            }
        });

        // Auto Match (Tier 1): rule-based matched jobs for this employee
        const formatSalary = (job: any) => {
            const s = job?.salary;
            if (!s?.amount) return 'Thương lượng';
            const amount = Number(s.amount);
            const unit = s.unit === 'day' ? 'ngày' : s.unit === 'month' ? 'tháng' : s.unit === 'hour' ? 'giờ' : 'dự án';
            const pretty = amount >= 1_000_000 ? `${Math.round(amount / 1_000_000)}M` : `${Math.round(amount / 1_000)}k`;
            return `${pretty}/${unit}`;
        };

        let matchedJobs: Array<{ id: string; title: string; location: string; matchScore: number; salary: string; company: string }> = [];
        try {
            const results = await getMatchedJobsForEmployee(userId);
            const hr = (job: any) => job?.hrId;
            matchedJobs = results.map((r) => {
                const j = r.job as any;
                const company = hr(j)?.companyName || (hr(j)?.firstName ? `${hr(j).firstName} ${hr(j).lastName || ''}`.trim() : 'Nhà tuyển dụng');
                return {
                    id: String(j._id),
                    title: j.title || '',
                    location: j.location?.province || j.location?.city || 'Việt Nam',
                    matchScore: r.matchScore,
                    salary: formatSalary(j),
                    company,
                };
            });
        } catch (matchErr) {
            console.warn('Match service failed, returning empty list:', matchErr);
        }

        res.json({
            success: true,
            message: 'Survey submitted successfully',
            data: {
                matchedJobs
            }
        });
    } catch (err: any) {
        console.error('❌ Survey submission error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to submit survey',
            error: err.message
        });
    }
};

export const getLatestSurvey = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const survey = await SurveyAnswer.findOne({ userId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: survey
        });
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: 'Failed to get survey',
            error: err.message
        });
    }
};
