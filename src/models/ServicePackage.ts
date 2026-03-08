import mongoose, { Document, Schema } from 'mongoose';

export interface IServicePackage extends Document {
  name: string;
  slug: string;
  description: string;
  features: string[];
  price: number;
  jobPostLimit: number; // -1 = unlimited
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  // Benefit flags / metadata
  hasAiMatching: boolean;
  priorityLevel: number; // 0: none, 1: Pro, 2: Enterprise
  maxHrAccounts: number;
  createdAt: Date;
  updatedAt: Date;
}

const servicePackageSchema = new Schema<IServicePackage>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, required: true },
  features: [{ type: String }],
  price: { type: Number, required: true, min: 0 },
  jobPostLimit: { type: Number, required: true, default: 3 },
  durationDays: { type: Number, required: true, default: 30 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  hasAiMatching: { type: Boolean, default: false },
  priorityLevel: { type: Number, default: 0 },
  maxHrAccounts: { type: Number, default: 1 },
}, { timestamps: true });

export const ServicePackage = mongoose.model<IServicePackage>('ServicePackage', servicePackageSchema);
