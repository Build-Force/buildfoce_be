import mongoose, { Document, Schema, Types } from 'mongoose';

export type ReviewerRole = 'HR' | 'EMPLOYEE';

export interface IReview extends Document {
    applicationId: Types.ObjectId;
    jobId: Types.ObjectId;
    reviewerId: Types.ObjectId;
    targetId: Types.ObjectId;
    reviewerRole: ReviewerRole;
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
        applicationId: {
            type: Schema.Types.ObjectId,
            ref: 'JobApplication',
            required: true,
            index: true,
        },
        jobId: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
            index: true,
        },
        reviewerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        targetId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        reviewerRole: {
            type: String,
            enum: ['HR', 'EMPLOYEE'],
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

reviewSchema.index({ applicationId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ targetId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
