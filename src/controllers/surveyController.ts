import { Request, Response } from 'express';
import { SurveyAnswer } from '../models/SurveyAnswer';
import { User } from '../models/User';

export const submitSurvey = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        const { primaryTrade, skills, experienceYears, preferredLocation, expectedSalary, availability } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const surveyAnswer = new SurveyAnswer({
            userId,
            primaryTrade,
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

        // Trigger AI matching (Mock response for now)
        // In a real scenario, this would call an AI service or run a complex query
        const mockMatchedJobs = [
            {
                id: '1',
                title: 'Senior Electrician',
                location: 'Đà Nẵng',
                matchScore: 92,
                salary: '15M - 20M',
                company: 'BuildForce Construction'
            },
            {
                id: '2',
                title: 'Civil Engineer',
                location: 'Hội An',
                matchScore: 88,
                salary: '25M - 35M',
                company: 'Urban Builders'
            },
            {
                id: '3',
                title: 'Welding Specialist',
                location: 'Đà Nẵng',
                matchScore: 85,
                salary: '12M - 18M',
                company: 'Steel Master Co.'
            },
            {
                id: '4',
                title: 'Construction Foreman',
                location: 'Tam Kỳ',
                matchScore: 82,
                salary: '20M - 30M',
                company: 'D&N Development'
            },
            {
                id: '5',
                title: 'Painter',
                location: 'Đà Nẵng',
                matchScore: 78,
                salary: '8M - 12M',
                company: 'Color Plus'
            }
        ];

        res.json({
            success: true,
            message: 'Survey submitted successfully',
            data: {
                matchedJobs: mockMatchedJobs
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
