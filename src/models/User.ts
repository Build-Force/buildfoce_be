import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { RoleType, USER_ROLES } from '../constants/roles';

export interface IUser extends Document {
    email?: string;
    phone?: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: RoleType;
    provider: 'local' | 'google' | 'facebook'; // Kept for future integration
    isVerified: boolean; // Verified email or phone OTP
    isActive: boolean; // For suspending/deleting user
    avatar?: string;

    // Specific to employee (User role)
    cccdHash?: string;
    isCccdVerified?: boolean;

    // Specific to HR
    companyName?: string;
    taxCode?: string;
    packageTier?: string;
    packageActiveUntil?: Date;

    // Added from Survey
    skills?: string[];
    experienceYears?: string;
    preferredLocationCity?: string;
    expectedSalary?: string;

    createdAt: Date;
    updatedAt: Date;

    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
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
        required: function (this: any) { return this.provider === 'local'; },
        minlength: 6,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        set: (val: string) => val ? val.normalize('NFC') : val,
    },
    lastName: {
        type: String,
        required: function (this: any) { return this.provider === 'local'; },
        trim: true,
        set: (val: string) => val ? val.normalize('NFC') : val,
    },
    role: {
        type: String,
        enum: Object.values(USER_ROLES),
        default: USER_ROLES.USER,
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
    avatar: {
        type: String,
        trim: true,
    },
    // Employee details
    cccdHash: {
        type: String,
        select: false, // Don't return heavily sensitive hash by default
    },
    isCccdVerified: {
        type: Boolean,
        default: false,
    },
    // HR Details
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
    // Survey details
    skills: [{
        type: String
    }],
    experienceYears: {
        type: String,
    },
    preferredLocationCity: {
        type: String,
    },
    expectedSalary: {
        type: String,
    },
}, {
    timestamps: true,
});

// Require at least an email or phone for logging in/registration
userSchema.pre('validate', function (next) {
    if (!this.email && !this.phone) {
        next(new Error('At least an email or phone must be provided.'));
    } else {
        next();
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.get('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password as string, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    const hashed = this.password as string | undefined;
    if (!hashed) return false;
    return bcrypt.compare(candidatePassword, hashed);
};

export const User = mongoose.model<IUser>('User', userSchema);
