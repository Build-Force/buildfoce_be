import mongoose, { Document, Schema, Types } from 'mongoose';

export type JobStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FILLED'
  | 'CLOSED'
  | 'COMPLETED';

export interface IJobLocation {
  city?: string;
  province: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface IJobSalary {
  amount: number;
  unit: 'day' | 'month' | 'hour' | 'project';
  currency: 'VND';
}

export interface IAdminReview {
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reason?: string;
}

export interface IJob extends Document {
  hrId: Types.ObjectId;
  title: string;
  description?: string;
  requirements?: string;
  skills: string[];
  location: IJobLocation;
  salary: IJobSalary;
  workersNeeded: number;
  workersHired: number;
  startDate?: Date;
  endDate?: Date;
  status: JobStatus;
  adminReview?: IAdminReview;
  /** URLs of job images (from Cloudinary) */
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    hrId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    requirements: {
      type: String,
      trim: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      city: { type: String, trim: true },
      province: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
      lat: { type: Number },
      lng: { type: Number },
    },
    salary: {
      amount: { type: Number, required: true, min: 0 },
      unit: { type: String, enum: ['day', 'month', 'hour', 'project'], required: true },
      currency: { type: String, enum: ['VND'], default: 'VND' },
    },
    workersNeeded: {
      type: Number,
      required: true,
      min: 1,
    },
    workersHired: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'FILLED', 'CLOSED', 'COMPLETED'],
      default: 'DRAFT',
      index: true,
    },
    adminReview: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      reason: { type: String, trim: true },
    },
    images: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  },
);

jobSchema.index({ hrId: 1, status: 1, createdAt: -1 });
jobSchema.index({ status: 1, updatedAt: -1 });

export const Job = mongoose.model<IJob>('Job', jobSchema);
