import { Schema, model, models, Types } from 'mongoose';

export interface IJob {
  hrProfileId: Types.ObjectId;
  title: string;
  description: string;
  jobType: 'ENGINEER' | 'WORKER';
  quantity: number;
  region: string;
  location: {
    type: 'Point';
    coordinates: number[];
  };
  workingTime: string;
  salary: string;
  deadline: Date;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXPIRED' | 'CLOSED';
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    hrProfileId: { type: Schema.Types.ObjectId, ref: 'HrProfile', required: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    jobType: {
      type: String,
      enum: ['ENGINEER', 'WORKER'],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    region: { type: String, required: true, index: true },
    location: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        default: [106.6297, 10.8231],
      },
    },
    workingTime: { type: String, required: true },
    salary: { type: String, required: true },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'EXPIRED', 'CLOSED'],
      default: 'DRAFT',
      index: true,
    },
    rejectReason: { type: String, default: '' },
  },
  { timestamps: true },
);

jobSchema.index({ location: '2dsphere' });

export const Job = models.Job || model<IJob>('Job', jobSchema);
