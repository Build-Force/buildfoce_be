import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  hrId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  requirements?: string;
  jobType: 'day' | 'month' | 'long-term';
  workers: number;
  province: string;
  address?: string;
  salary: number;
  salaryType: 'day' | 'month';
  startDate?: Date;
  endDate?: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'expired' | 'closed';
  priorityLevel: number;
  hrPackageName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>({
  hrId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  requirements: { type: String },
  jobType: { type: String, enum: ['day', 'month', 'long-term'], default: 'day' },
  workers: { type: Number, required: true, min: 1 },
  province: { type: String, required: true },
  address: { type: String },
  salary: { type: Number, required: true, min: 0 },
  salaryType: { type: String, enum: ['day', 'month'], default: 'day' },
  startDate: { type: Date },
  endDate: { type: Date },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'expired', 'closed'],
    default: 'pending_approval',
  },
  priorityLevel: { type: Number, default: 0, index: true },
  hrPackageName: { type: String },
}, { timestamps: true });

export const Job = mongoose.model<IJob>('Job', jobSchema);

