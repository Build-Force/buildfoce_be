import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES, RoleType } from '../constants/roles';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface IUser extends Document {
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  firstName: string;
  lastName?: string;
  role: RoleType;
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

  // Survey / profile fields
  skills?: string[];
  experienceYears?: string;
  preferredLocationCity?: string;
  expectedSalary?: string;

  createdAt: Date;
  updatedAt: Date;

  comparePassword(_candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
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
      required(this: any) {
        return this.provider === 'local';
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
      required(this: any) {
        return this.provider === 'local';
      },
      trim: true,
      set: (val: string) => (val ? val.normalize('NFC') : val),
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
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
      enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
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
    packageTier: {
      type: String,
      trim: true,
    },
    packageActiveUntil: {
      type: Date,
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

// Require at least one of email, phone, or username
userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone && !this.username) {
    next(new Error('At least an email, phone, or username must be provided.'));
    return;
  }
  next();
});

// Hash password before saving
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

// Keep status in sync with isActive
userSchema.pre('save', function (next) {
  if (!this.isModified('isActive') && !this.isModified('status')) {
    next();
    return;
  }

  if (!this.isActive) {
    this.status = this.status === 'DELETED' ? 'DELETED' : 'SUSPENDED';
  } else if (this.status !== 'DELETED') {
    this.status = 'ACTIVE';
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
