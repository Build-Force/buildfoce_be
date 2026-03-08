import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'package_purchase';
  amount: number;
  packageId?: mongoose.Types.ObjectId;
  packageName?: string;
  transactionCode?: string;
  sessionId: string;
  sepayTransactionId?: number;
  gateway?: string;
  referenceCode?: string;
  content?: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['package_purchase'], required: true },
  amount: { type: Number, required: true, min: 0 },
  packageId: { type: Schema.Types.ObjectId, ref: 'ServicePackage' },
  packageName: { type: String },
  transactionCode: { type: String },
  sessionId: { type: String, required: true, index: true },
  sepayTransactionId: { type: Number },
  gateway: { type: String },
  referenceCode: { type: String },
  content: { type: String },
  description: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

transactionSchema.index({ sepayTransactionId: 1 }, { unique: true, sparse: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
