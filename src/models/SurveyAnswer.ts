import mongoose, { Document, Schema } from 'mongoose';

export interface ISurveyAnswer extends Document {
    userId: mongoose.Types.ObjectId;
    primaryTrade: string; // Worker, Engineer, Foreman
    skills: string[];
    experienceYears: string; // < 1, 1-3, 3-5, 5+
    preferredLocation: {
        city: string;
        radius: number;
    };
    expectedSalary: string;
    availability: string; // Ready, 1 week, 1 month
    createdAt: Date;
}

const surveyAnswerSchema = new Schema<ISurveyAnswer>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    primaryTrade: {
        type: String,
        required: true
    },
    skills: [{
        type: String
    }],
    experienceYears: {
        type: String,
        required: true
    },
    preferredLocation: {
        city: {
            type: String,
            required: true
        },
        radius: {
            type: Number,
            required: true,
            default: 10
        }
    },
    expectedSalary: {
        type: String,
        required: true
    },
    availability: {
        type: String,
        required: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

export const SurveyAnswer = mongoose.model<ISurveyAnswer>('SurveyAnswer', surveyAnswerSchema);
