import { Schema, model, models } from 'mongoose';

export type UserRole = 'USER' | 'HR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface IUser {
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['USER', 'HR', 'ADMIN'],
      default: 'USER',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true },
);

export const User = models.User || model<IUser>('User', userSchema);
