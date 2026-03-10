import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkerCV extends Document {
  userId: mongoose.Types.ObjectId;
  content: {
    personalInfo?: {
      name?: string;
      title?: string;
      email?: string;
      phone?: string;
      address?: string;
      website?: string;
      avatar?: string;
    };
    summary?: string;
    experiences?: Array<{
      id?: string;
      role?: string;
      company?: string;
      duration?: string;
      description?: string;
    }>;
    education?: Array<{
      id?: string;
      degree?: string;
      school?: string;
      duration?: string;
    }>;
    skills?: string[];
  };
  updatedAt: Date;
}

const workerCVSchema = new Schema<IWorkerCV>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    content: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export const WorkerCV = mongoose.models.WorkerCV || mongoose.model<IWorkerCV>('WorkerCV', workerCVSchema);
