import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPackage extends Document {
  userId: mongoose.Types.ObjectId;
  packageId: mongoose.Types.ObjectId;
  packageName: string;
  jobPostLimit: number;
  jobPostUsed: number;
  activatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  transactionId?: mongoose.Types.ObjectId;
  // Snapshot of key benefits at activation time
  priorityLevel: number;
  hasAiMatching: boolean;
  maxHrAccounts: number;
  createdAt: Date;
  updatedAt: Date;
}

const userPackageSchema = new Schema<IUserPackage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  packageId: { type: Schema.Types.ObjectId, ref: 'ServicePackage', required: true },
  packageName: { type: String, required: true },
  jobPostLimit: { type: Number, required: true },
  jobPostUsed: { type: Number, default: 0 },
  activatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  isActive: { type: Boolean, default: true },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  priorityLevel: { type: Number, default: 0 },
  hasAiMatching: { type: Boolean, default: false },
  maxHrAccounts: { type: Number, default: 1 },
}, { timestamps: true });

userPackageSchema.index({ userId: 1, isActive: 1 });

export const UserPackage = mongoose.model<IUserPackage>('UserPackage', userPackageSchema);
