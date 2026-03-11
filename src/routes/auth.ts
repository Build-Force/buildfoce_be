import { RequestHandler, Router } from 'express';
import { body } from 'express-validator';
import {
    register,
    login,
    getProfile,
    updateProfile,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    verifyEmailByLink,
    checkVerificationStatus,
    changePassword,
    uploadUserAvatar,
    uploadCompanyProfileImage,
    googleCallback,
    verifyGoogleEmail
} from '../controllers/authController';
import { validate } from '../middlewares/validation';
import { authMiddleware } from '../middlewares/auth';
import { uploadAvatar, uploadProfileDoc, handleUploadError } from '../middlewares/upload';
import { AUTH_PATHS } from '../constants/paths';
import passport from '../config/passport';

const router = Router();

// Validation Rules
const registerValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .toLowerCase(),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address format'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phone')
        .optional()
        .matches(/^[0-9+\-\s()]+$/)
        .withMessage('Invalid phone number'),
    body('role').isIn(['user', 'hr']).withMessage('Invalid role specified (must be user or hr)'),
    body('companyName').if(body('role').equals('hr')).notEmpty().withMessage('Company Name is required for HR'),
    body('taxCode').if(body('role').equals('hr')).notEmpty().withMessage('Tax Code is required for HR'),
];

const loginValidation = [
    body('identifier').trim().notEmpty().withMessage('Username or Email is required to login'),
    body('password').notEmpty().withMessage('Password cannot be empty'),
];

const forgotPasswordValidation = [
    body('identifier').notEmpty().withMessage('Username, Email or Phone is required'),
];

const verifyResetOtpValidation = [
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
    body('tempToken').notEmpty().withMessage('tempToken is required'),
];

const resetPasswordValidation = [
    body('newPassword').isLength({ min: 6 }).withMessage('New Password must be at least 6 characters long'),
    body('resetToken').notEmpty().withMessage('resetToken is required'),
];

// Mount endpoints
router.post(AUTH_PATHS.REGISTER, validate(registerValidation), register);
router.post(AUTH_PATHS.LOGIN, validate(loginValidation), login);

// Email Verification link validation via GET (Link) or POST (API)
router.get(AUTH_PATHS.VERIFY_LINK_EMAIL, verifyEmailByLink);
router.post(AUTH_PATHS.VERIFY_LINK_EMAIL, verifyEmailByLink);
router.post(AUTH_PATHS.CHECK_VERIFICATION, checkVerificationStatus);

// Google OAuth
router.get(AUTH_PATHS.GOOGLE, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(AUTH_PATHS.GOOGLE_CALLBACK, passport.authenticate('google', { session: false }), googleCallback);
router.get(AUTH_PATHS.VERIFY_GOOGLE_EMAIL, verifyGoogleEmail);

// Forgot Password Flow
router.post(AUTH_PATHS.FORGOT_PASSWORD, validate(forgotPasswordValidation), forgotPassword);
router.post(AUTH_PATHS.VERIFY_RESET_OTP, validate(verifyResetOtpValidation), verifyResetOtp);
router.post(AUTH_PATHS.RESET_PASSWORD, validate(resetPasswordValidation), resetPassword);

// Profile
router.get('/profile', authMiddleware as RequestHandler, getProfile);
router.put('/profile', authMiddleware as RequestHandler, updateProfile);

// Change Password (requires auth)
router.put(AUTH_PATHS.CHANGE_PASSWORD, authMiddleware as RequestHandler, [
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], validate([]), changePassword);

// Upload Avatar (requires auth + multer Cloudinary middleware)
router.post('/upload-avatar', authMiddleware as RequestHandler, uploadAvatar.single('avatar'), handleUploadError, uploadUserAvatar);

// Upload Company Profile Image (requires auth)
// HR Profile Document Upload (supports PDF and images)
router.post('/upload-company-image', authMiddleware as RequestHandler, uploadProfileDoc.single('image'), handleUploadError, uploadCompanyProfileImage);

export default {
    router,
    path: AUTH_PATHS.BASE,
};
