import mongoose, { Document, Schema, Types } from 'mongoose';

export type ApplicationStatus =
    | 'APPLIED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'HIRED'
    | 'COMPLETION_PENDING'
    | 'COMPLETED';

export interface ICompletion {
    workerConfirmedAt?: Date;
    hrConfirmedAt?: Date;
}

export interface IJobApplication extends Document {
    jobId: Types.ObjectId;
    workerId: Types.ObjectId;
    hrId: Types.ObjectId;
    status: ApplicationStatus;
    appliedAt: Date;
    decidedAt?: Date;
    decisionReason?: string;
    hireConfirmedAt?: Date;
    completion?: ICompletion;
    createdAt: Date;
    updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>({
    jobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true,
    },
    workerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    hrId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['APPLIED', 'ACCEPTED', 'REJECTED', 'HIRED', 'COMPLETION_PENDING', 'COMPLETED'],
        default: 'APPLIED',
        index: true,
    },
    appliedAt: {
        type: Date,
        default: Date.now,
    },
    decidedAt: { type: Date },
    decisionReason: { type: String, trim: true },
    hireConfirmedAt: { type: Date },
    completion: {
        workerConfirmedAt: { type: Date },
        hrConfirmedAt: { type: Date },
    },
}, {
    timestamps: true,
});

jobApplicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true });
jobApplicationSchema.index({ hrId: 1, status: 1, updatedAt: -1 });

export const JobApplication = mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema);

