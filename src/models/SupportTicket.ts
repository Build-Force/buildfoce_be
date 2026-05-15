import { Schema, model, models, Types } from 'mongoose';

export interface ISupportTicket {
  userId: Types.ObjectId;
  subject: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true, index: true },
    message: { type: String, required: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    adminReply: { type: String, default: '' },
  },
  { timestamps: true },
);

export const SupportTicket = models.SupportTicket || model<ISupportTicket>('SupportTicket', supportTicketSchema);
