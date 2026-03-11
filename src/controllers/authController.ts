import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { HrProfile } from '../models/HrProfile';
import { Review } from '../models/Review';
import { JobApplication } from '../models/JobApplication';
import { env } from '../config/env';
import { generateOTP, hashOTP, verifyOTP } from '../utils/otp';
import { sendOTPEmail, sendVerifyLinkEmail } from '../utils/email';

// Helper function to generate JWT token
const generateToken = (payload: any): string => {
    const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as any };
    return jwt.sign(payload, env.JWT_SECRET, options);
};

// Fallback temp secret if not set in .env
const TEMP_TOKEN_SECRET = process.env.TEMP_TOKEN_SECRET || 'buildforce_temp_secret';

// ====================== REGISTER ======================
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, firstName, lastName, phone, role, companyName, taxCode } = req.body;

        const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
        if (!normalizedUsername) {
            res.status(400).json({ success: false, message: 'Username is required' });
            return;
        }

        // BuildForce requires email
        if (!email) {
            res.status(400).json({ success: false, message: 'Email is required' });
            return;
        }

        // Check for duplicate email
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            res.status(400).json({ success: false, message: 'Email already exists' });
            return;
        }

        {
            const existingUsername = await User.findOne({ username: normalizedUsername });
            if (existingUsername) {
                res.status(400).json({ success: false, message: 'Username already exists' });
                return;
            }
        }

        // Checking duplicate phone if provided
        if (phone) {
            const existingPhone = await User.findOne({ phone });
            if (existingPhone) {
                res.status(400).json({ success: false, message: 'Phone already exists' });
                return;
            }
        }

        // Create a verification token with user data (expires in 24h)
        const payload: any = { username: normalizedUsername, email, password, firstName, lastName, phone, role };
        if (role === 'hr') {
            payload.companyName = companyName;
            payload.taxCode = taxCode;
        }

        const verifyToken = jwt.sign(payload, TEMP_TOKEN_SECRET, { expiresIn: '24h' });

        // Verification link must use production URL in production (never localhost)
        const frontendBase = env.FRONTEND_URL || process.env.FRONTEND_URL || '';
        if (process.env.NODE_ENV === 'production' && (!frontendBase || frontendBase.includes('localhost'))) {
            console.error('❌ FRONTEND_URL is missing or localhost in production. Set FRONTEND_URL to your production domain (e.g. https://yourdomain.com) in .env or server environment.');
            res.status(500).json({ success: false, message: 'Server configuration error. Please contact support.' });
            return;
        }
        const verifyUrl = `${frontendBase || 'http://localhost:3000'}/auth/verify-link-email?token=${verifyToken}`;

        try {
            await sendVerifyLinkEmail(email, verifyUrl);
        } catch (emailError: any) {
            const rawMessage = emailError?.response?.body?.errors?.[0]?.message || emailError?.message || '';
            const isQuotaError = /maximum credits exceeded|quota|limit exceeded/i.test(String(rawMessage));
            // Log detailed SendGrid errors for debugging
            console.error('❌ Failed to send verify link email:', emailError?.message);
            if (emailError?.response?.body) {
                console.error('📧 SendGrid error details:', JSON.stringify(emailError.response.body, null, 2));
            }
            res.status(500).json({
                success: false,
                message: isQuotaError
                    ? 'Dịch vụ gửi email tạm thời không khả dụng (đã hết hạn mức). Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
                    : 'Failed to send verification email. Please try again later.',
                emailError: rawMessage
            });
            return;
        }

        res.json({
            success: true,
            message: 'A verification link has been sent to your email. Please check your inbox to activate your account.',
        });
    } catch (err) {
        console.error('❌ Registration error:', err);
        res.status(500).json({
            success: false,
            message: 'Registration error. Please try again later.',
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
};

// ====================== VERIFY EMAIL ======================
export const verifyEmailByLink = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = (req.query.token as string) || (req.body && (req.body as any).token);

        if (!token) {
            res.status(400).json({ success: false, message: 'Missing verification token' });
            return;
        }

        let decoded: any;
        try {
            decoded = jwt.verify(token, TEMP_TOKEN_SECRET);
        } catch (_jwtError) {
            res.status(400).json({ success: false, message: 'Invalid or expired token' });
            return;
        }

        const { username, email, password, firstName, lastName, phone, role, companyName, taxCode } = decoded;
        const normalizedUsername = username ? String(username).trim().toLowerCase() : undefined;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // In case they click the link twice
            res.status(400).json({ success: false, message: 'Email is already registered. Please sign in.' });
            return;
        }

        if (normalizedUsername) {
            const existingUsername = await User.findOne({ username: normalizedUsername });
            if (existingUsername) {
                res.status(400).json({ success: false, message: 'Username already exists' });
                return;
            }
        }

        // Save user with isVerified = true
        const user = new User({
            username: normalizedUsername,
            email,
            password,
            firstName,
            lastName,
            phone,
            role,
            companyName,
            taxCode,
            isVerified: true,
            isActive: true
        });
        await user.save();

        // Ideally FE sends a token via API and we simply return JSON
        if (req.method === 'POST') {
            res.json({ success: true, message: 'Email verified successfully! You can now login.' });
            return;
        }

        // Redirect logic for simple GET requests directly from email
        const redirectUrl = `${env.FRONTEND_URL}/auth/login?verified=success&email=${encodeURIComponent(email)}`;
        res.redirect(redirectUrl);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Verification error. Please try again.', error: err.message });
    }
};

// ====================== LOGIN ======================
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        // Allows login using email or phone
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            res.status(400).json({ success: false, message: 'Email/Phone and Password are required' });
            return;
        }

        // Try finding by email or phone or username
        const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }, { username: identifier }] }).select('+password');
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        if (!user.isActive) {
            res.status(401).json({ success: false, message: 'Account has been suspended or is inactive' });
            return;
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        // Generate token payload
        const payload = {
            userId: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
        };

        const token = generateToken(payload);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    avatar: user.avatar,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    companyName: user.companyName, // if hr
                    profileDocumentImage: user.profileDocumentImage,
                },
                token,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// ====================== GET PROFILE ======================
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const user = await User.findById(userId).select('-password -cccdHash').lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const data: Record<string, any> = { ...user };

        const objectUserId = new mongoose.Types.ObjectId(userId);

        if ((user as any).role === 'hr') {
            const hrProfile = await HrProfile.findOne({ userId: objectUserId }).select('totalJobsPosted').lean() as { totalJobsPosted?: number } | null;
            data.totalJobsPosted = hrProfile?.totalJobsPosted ?? 0;
            const stats = await Review.aggregate([
                { $match: { targetId: objectUserId } },
                { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
            ]);
            data.averageRating = stats[0] ? Math.round((stats[0].avg as number) * 10) / 10 : 0;
            data.reviewCount = stats[0]?.count ?? 0;
        } else {
            const stats = await Review.aggregate([
                { $match: { targetId: objectUserId } },
                { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
            ]);
            data.averageRating = stats[0] ? Math.round((stats[0].avg as number) * 10) / 10 : 0;
            data.reviewCount = stats[0]?.count ?? 0;
            const jobsCompleted = await JobApplication.countDocuments({ workerId: objectUserId, status: 'COMPLETED' });
            data.jobsCompleted = jobsCompleted;
        }

        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Get profile error', error: err.message });
    }
};

// ====================== FORGOT PASSWORD ======================
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            res.status(400).json({ success: false, message: "Identifier is required" });
            return;
        }

        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }, { username: identifier }]
        });

        if (!user) {
            res.status(404).json({ success: false, message: "Account not found" });
            return;
        }

        if (!user.email) {
            res.status(400).json({ success: false, message: "No email associated with this account to send OTP to." });
            return;
        }

        const otp = generateOTP();
        const otpHash = hashOTP(otp);

        try {
            await sendOTPEmail(user.email, otp);
        } catch (error) {
            res.status(500).json({ success: false, message: "Unable to send OTP via email" });
            return;
        }

        const tempToken = jwt.sign({ email: user.email, otpHash }, TEMP_TOKEN_SECRET, { expiresIn: "5m" });

        res.json({
            success: true,
            message: "OTP has been sent to your email",
            tempToken,
            email: user.email,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: "Forgot password error", error: err.message });
    }
};

// ====================== VERIFY FORGOT OTP ======================
export const verifyResetOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { otp, tempToken } = req.body;

        let decoded: any;
        try {
            decoded = jwt.verify(tempToken, TEMP_TOKEN_SECRET);
        } catch {
            res.status(400).json({ success: false, message: "Invalid or expired OTP token" });
            return;
        }

        const { email, otpHash } = decoded;

        if (!verifyOTP(otp, otpHash)) {
            res.status(400).json({ success: false, message: "Incorrect OTP code" });
            return;
        }

        const resetToken = jwt.sign({ email }, TEMP_TOKEN_SECRET, { expiresIn: "10m" });

        res.json({
            success: true,
            message: "OTP is valid, please enter a new password",
            resetToken,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: "Verify reset OTP error", error: err.message });
    }
};

// ====================== RESTORE NEW PASSWORD ======================
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { newPassword, resetToken } = req.body;

        let decoded: any;
        try {
            decoded = jwt.verify(resetToken, TEMP_TOKEN_SECRET);
        } catch (_jwtError) {
            res.status(400).json({ success: false, message: "Invalid or expired reset token" });
            return;
        }

        const { email } = decoded;
        const user = await User.findOne({ email });
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: "Password changed successfully" });
    } catch (err: any) {
        res.status(500).json({ success: false, message: "Reset password error", error: err.message });
    }
};

// ====================== CHECK VERIFICATION STATUS ======================
export const checkVerificationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required"
            });
            return;
        }

        const user = await User.findOne({ email }).select('isVerified');

        if (!user) {
            // Because our registration model defers saving user until click link, 
            // if user is not found, it means they haven't verified yet.
            res.status(404).json({
                success: false,
                verified: false,
                message: "User not found or not verified yet"
            });
            return;
        }

        res.json({
            success: true,
            verified: user.isVerified,
            message: user.isVerified ? "Account has been verified" : "Account has not been verified"
        });
    } catch (err: any) {
        console.error('Check verification error:', err);
        res.status(500).json({
            success: false,
            message: "Verification status check error",
            error: err.message
        });
    }
};

// ====================== CHANGE PASSWORD (Authenticated) ======================
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            res.status(400).json({ success: false, message: 'Old password and new password are required' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
            return;
        }

        const user = await User.findById(userId).select('+password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Current password is incorrect' });
            return;
        }

        if (oldPassword === newPassword) {
            res.status(400).json({ success: false, message: 'New password must be different from current password' });
            return;
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err: any) {
        console.error('Change password error:', err);
        res.status(500).json({ success: false, message: 'Change password error', error: err.message });
    }
};

// ====================== UPLOAD AVATAR (Cloudinary) ======================
export const uploadUserAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const file = req.file as any;
        if (!file) {
            res.status(400).json({ success: false, message: 'No image file provided' });
            return;
        }

        // multer-storage-cloudinary stores the URL in file.path
        const avatarUrl: string = file.path;

        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        console.log(`✅ Avatar updated for user ${userId}: ${avatarUrl}`);
        res.json({
            success: true,
            message: 'Avatar updated successfully',
            data: { avatar: avatarUrl },
        });
    } catch (err: any) {
        console.error('Upload avatar error:', err);
        res.status(500).json({ success: false, message: 'Failed to upload avatar', error: err.message });
    }
};

// ====================== UPLOAD COMPANY PROFILE IMAGE ======================
export const uploadCompanyProfileImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const file = req.file as any;
        if (!file) {
            res.status(400).json({ success: false, message: 'No image file provided' });
            return;
        }

        const imageUrl: string = file.path;

        const user = await User.findByIdAndUpdate(
            userId,
            { profileDocumentImage: imageUrl },
            { new: true }
        ).select('-password');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        console.log(`\u2705 HR profile document image updated for ${userId}: ${imageUrl}`);
        res.json({
            success: true,
            message: 'Profile document image updated successfully',
            data: { profileDocumentImage: imageUrl },
        });
    } catch (err: any) {
        console.error('Upload profile document image error:', err);
        res.status(500).json({ success: false, message: 'Failed to upload profile document image', error: err.message });
    }
};

// ====================== UPDATE PROFILE ======================
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const existingUser = await User.findById(userId).select('provider role');
        if (!existingUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const { firstName, lastName, phone, companyName, taxCode, role } = req.body;

        // Build update object — only allow safe fields
        const updateData: any = {};
        if (firstName !== undefined) updateData.firstName = firstName.trim();
        if (lastName !== undefined) updateData.lastName = lastName.trim();
        if (phone !== undefined) updateData.phone = phone.trim() || null;
        if (companyName !== undefined) updateData.companyName = companyName.trim();
        if (taxCode !== undefined) updateData.taxCode = taxCode.trim();
        // Cho phép user đăng ký bằng Google đổi role lần đầu (user <-> hr)
        if (role !== undefined && existingUser.provider === 'google' && (role === 'user' || role === 'hr')) {
            updateData.role = role;
            if (role === 'hr' && (companyName === undefined || !companyName?.trim())) {
                updateData.companyName = updateData.companyName || 'Công ty của tôi';
                updateData.taxCode = updateData.taxCode || '000000000';
            }
        }

        // Validate firstName is not empty
        if (updateData.firstName !== undefined && !updateData.firstName) {
            res.status(400).json({ success: false, message: 'First name cannot be empty' });
            return;
        }

        // Check for duplicate phone if being changed
        if (updateData.phone) {
            const existingPhone = await User.findOne({ phone: updateData.phone, _id: { $ne: userId } });
            if (existingPhone) {
                res.status(400).json({ success: false, message: 'Phone number is already in use by another account' });
                return;
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password -cccdHash');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        console.log(`✅ Profile updated for user ${userId}`);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user,
        });
    } catch (err: any) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, message: 'Failed to update profile', error: err.message });
    }
};

// ====================== GOOGLE OAUTH ======================
const getFrontendUrl = () => env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

export const googleCallback = (req: Request, res: Response): void => {
    try {
        const user = (req as any).user as any;
        const frontendUrl = getFrontendUrl();

        if (user?.verificationRequired) {
            res.redirect(`${frontendUrl}/auth/google-verification-required?email=${encodeURIComponent(user.email)}`);
            return;
        }
        if (!user) {
            res.redirect(`${frontendUrl}/auth/social-callback?error=authentication_failed`);
            return;
        }

        const payload = {
            userId: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        const token = generateToken(payload);
        const newUserParam = user.isNewUser ? '&newUser=1' : '';
        res.redirect(`${frontendUrl}/auth/social-callback?token=${token}${newUserParam}`);
    } catch (err: any) {
        console.error('❌ Google login error:', err);
        const frontendUrl = getFrontendUrl();
        res.redirect(`${frontendUrl}/auth/social-callback?error=server_error`);
    }
};

export const verifyGoogleEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = (req.query.token as string) || '';
        const frontendUrl = getFrontendUrl();
        if (!token) {
            res.redirect(`${frontendUrl}/auth/social-callback?error=missing_token`);
            return;
        }
        let decoded: any;
        try {
            decoded = jwt.verify(token, TEMP_TOKEN_SECRET);
        } catch {
            res.redirect(`${frontendUrl}/auth/social-callback?error=invalid_token`);
            return;
        }
        const { email, firstName, lastName, provider, userId } = decoded;
        if (!email) {
            res.redirect(`${frontendUrl}/auth/social-callback?error=invalid_token`);
            return;
        }

        let user: any;
        if (userId) {
            user = await User.findById(userId);
            if (!user) {
                res.redirect(`${frontendUrl}/auth/social-callback?error=user_not_found`);
                return;
            }
            user.firstName = firstName ?? user.firstName;
            user.lastName = lastName ?? user.lastName;
            user.isVerified = true;
            user.provider = provider || 'google';
            await user.save();
        } else {
            const existing = await User.findOne({ email });
            if (existing) {
                existing.firstName = firstName ?? existing.firstName;
                existing.lastName = lastName ?? existing.lastName;
                existing.isVerified = true;
                (existing as any).provider = provider || 'google';
                await existing.save();
                user = existing;
            } else {
                user = await User.create({
                    email,
                    firstName: firstName || 'User',
                    lastName: lastName || '',
                    provider: 'google',
                    isVerified: true,
                    role: 'user',
                });
            }
        }

        const loginPayload = {
            userId: user._id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        const loginToken = generateToken(loginPayload);
        res.redirect(`${frontendUrl}/auth/google-verification-success?token=${loginToken}&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
        console.error('❌ Verify Google email error:', err);
        const frontendUrl = getFrontendUrl();
        res.redirect(`${frontendUrl}/auth/social-callback?error=verification_failed`);
    }
};

