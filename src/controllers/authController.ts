import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
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
        const { email, password, firstName, lastName, phone, role, companyName, taxCode } = req.body;

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

        // Checking duplicate phone if provided
        if (phone) {
            const existingPhone = await User.findOne({ phone });
            if (existingPhone) {
                res.status(400).json({ success: false, message: 'Phone already exists' });
                return;
            }
        }

        // Create a verification token with user data (expires in 24h)
        const payload: any = { email, password, firstName, lastName, phone, role };
        if (role === 'hr') {
            payload.companyName = companyName;
            payload.taxCode = taxCode;
        }

        const verifyToken = jwt.sign(payload, TEMP_TOKEN_SECRET, { expiresIn: '24h' });

        // Verification link points to FE page that will call BE verify endpoint
        const verifyUrl = `${env.FRONTEND_URL}/auth/verify-link-email?token=${verifyToken}`;

        try {
            await sendVerifyLinkEmail(email, verifyUrl);
        } catch (emailError: any) {
            // Log detailed SendGrid errors for debugging
            console.error('❌ Failed to send verify link email:', emailError?.message);
            if (emailError?.response?.body) {
                console.error('📧 SendGrid error details:', JSON.stringify(emailError.response.body, null, 2));
            }
            res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please try again later.',
                emailError: emailError?.response?.body?.errors?.[0]?.message || emailError?.message
            });
            return;
        }

        res.json({
            success: true,
            message: 'A verification link has been sent to your email. Please check your inbox to activate your account.',
            devVerifyUrl: verifyUrl
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
        } catch (jwtError) {
            res.status(400).json({ success: false, message: 'Invalid or expired token' });
            return;
        }

        const { email, password, firstName, lastName, phone, role, companyName, taxCode } = decoded;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // In case they click the link twice
            res.status(400).json({ success: false, message: 'Email is already registered. Please sign in.' });
            return;
        }

        // Save user with isVerified = true
        const user = new User({
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

        // Try finding by email or phone
        const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select('+password');
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
                    email: user.email,
                    phone: user.phone,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    avatar: user.avatar,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    companyName: user.companyName, // if hr
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
        const user = await User.findById(userId).select('-password -cccdHash');

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.json({ success: true, data: user });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Get profile error', error: err.message });
    }
};

// ====================== FORGOT PASSWORD ======================
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            res.status(404).json({ success: false, message: "Email not found" });
            return;
        }

        const otp = generateOTP();
        const otpHash = hashOTP(otp);

        try {
            await sendOTPEmail(email, otp);
        } catch (error) {
            res.status(500).json({ success: false, message: "Unable to send OTP via email" });
            return;
        }

        const tempToken = jwt.sign({ email, otpHash }, TEMP_TOKEN_SECRET, { expiresIn: "5m" });

        res.json({
            success: true,
            message: "OTP has been sent to your email",
            tempToken,
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
        } catch (jwtError) {
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

// ====================== UPDATE PROFILE ======================
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { firstName, lastName, phone, companyName, taxCode } = req.body;

        // Build update object — only allow safe fields
        const updateData: any = {};
        if (firstName !== undefined) updateData.firstName = firstName.trim();
        if (lastName !== undefined) updateData.lastName = lastName.trim();
        if (phone !== undefined) updateData.phone = phone.trim() || null;
        if (companyName !== undefined) updateData.companyName = companyName.trim();
        if (taxCode !== undefined) updateData.taxCode = taxCode.trim();

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

