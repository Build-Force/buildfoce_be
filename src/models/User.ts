import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'USER' | 'HR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  password?: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  provider: 'local' | 'google' | 'facebook';
  isVerified: boolean;
  isActive: boolean;
  status: UserStatus;
  avatar?: string;

  // Employee fields
  cccdHash?: string;
  isCccdVerified?: boolean;

  // HR fields
  companyName?: string;
  taxCode?: string;
  packageTier?: string;
  packageActiveUntil?: Date;

  // Survey fields
  skills?: string[];
  experienceYears?: string;
  preferredLocationCity?: string;
  expectedSalary?: string;

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const ROLE_VALUES: UserRole[] = ['USER', 'HR', 'ADMIN'];
const STATUS_VALUES: UserStatus[] = ['ACTIVE', 'SUSPENDED', 'DELETED'];

const toUserRole = (value: unknown): UserRole => {
  const upper = String(value || 'USER').toUpperCase();
  if (upper === 'HR') return 'HR';
  if (upper === 'ADMIN') return 'ADMIN';
  return 'USER';
};

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      sparse: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return (this as any).provider === 'local';
      },
      minlength: 6,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      set: (val: string) => (val ? val.normalize('NFC') : val),
    },
    lastName: {
      type: String,
      required: function () {
        return (this as any).provider === 'local';
      },
      trim: true,
      set: (val: string) => (val ? val.normalize('NFC') : val),
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: 'USER',
      set: toUserRole,
      index: true,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'ACTIVE',
      index: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    cccdHash: {
      type: String,
      select: false,
    },
    isCccdVerified: {
      type: Boolean,
      default: false,
    },
    companyName: {
      type: String,
      trim: true,
    },
    taxCode: {
      type: String,
      trim: true,
    },
    skills: [{ type: String }],
    experienceYears: {
      type: String,
    },
    preferredLocationCity: {
      type: String,
    },
    expectedSalary: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    next(new Error('At least an email or phone must be provided.'));
    return;
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    next();
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.pre('save', function (next) {
  this.status = this.isActive ? 'ACTIVE' : this.status === 'DELETED' ? 'DELETED' : 'SUSPENDED';
  next();
});

userSchema.methods.comparePassword = async function (passwordCandidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(passwordCandidate, this.password);
};

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
