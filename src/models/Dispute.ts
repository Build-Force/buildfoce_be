import { Schema, model, models, Types } from 'mongoose';

export interface IDispute {
  reporterId: Types.ObjectId;
  targetId: Types.ObjectId;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  description: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED'],
      default: 'OPEN',
      index: true,
    },
    description: { type: String, required: true },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Dispute = models.Dispute || model<IDispute>('Dispute', disputeSchema);
