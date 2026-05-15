import { Schema, model, models, Types } from 'mongoose';

export interface IHrProfile {
  userId: Types.ObjectId;
  companyName: string;
  taxCode: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: number[];
  };
  contactInfo: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isBlacklisted: boolean;
  blacklistReason?: string;
  totalJobsPosted: number;
  totalJobsCompleted: number;
  averageRating: number;
  totalReports: number;
  onTimePaymentRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const hrProfileSchema = new Schema<IHrProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyName: { type: String, required: true, trim: true, index: true },
    taxCode: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true },
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
    contactInfo: { type: String, required: true },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    isBlacklisted: { type: Boolean, default: false, index: true },
    blacklistReason: { type: String, default: '' },
    totalJobsPosted: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalReports: { type: Number, default: 0 },
    onTimePaymentRate: { type: Number, default: 100 },
  },
  { timestamps: true },
);

hrProfileSchema.index({ location: '2dsphere' });

export const HrProfile = models.HrProfile || model<IHrProfile>('HrProfile', hrProfileSchema);
