import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer, { FileFilterCallback } from 'multer';
import cloudinary from '../config/cloudinary';
import { Request } from 'express';

// Avatar storage: crop to 400x400, face-centered
const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'buildforce/avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    } as any,
});

// Blog image storage
const blogImageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'buildforce/blogs',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
        transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
    } as any,
});

// Blog video storage
const blogVideoStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'buildforce/blogs/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov'],
    } as any,
});

// Job image storage (tin tuyển dụng)
const jobImageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'buildforce/jobs',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
        transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
    } as any,
});

// Profile document storage (HR Profile - image or PDF)
const profileDocStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'buildforce/profile_documents',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
        resource_type: 'auto', // Important for PDF
    } as any,
});

const generalImageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'buildforce/general',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
        transformation: [{ width: 1600, quality: 'auto', fetch_format: 'auto' }],
    } as any,
});

// Image file filter
const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

const docFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only images and PDF files are allowed'));
    }
};

// Video file filter
const videoFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only video files are allowed'));
    }
};

// Avatar upload middleware
export const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: imageFileFilter,
});

// Blog image upload middleware
export const uploadBlogImage = multer({
    storage: blogImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: imageFileFilter,
});

// Blog video upload middleware
export const uploadBlogVideo = multer({
    storage: blogVideoStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: videoFileFilter,
});

// Job image upload middleware
export const uploadJobImage = multer({
    storage: jobImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: imageFileFilter,
});

// Profile document upload middleware
export const uploadProfileDoc = multer({
    storage: profileDocStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: docFileFilter,
});

export const uploadGeneralImage = multer({
    storage: generalImageStorage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: imageFileFilter,
});

// Multer error handler
export const handleUploadError = (error: any, _req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large.' });
        }
        return res.status(400).json({ success: false, message: 'Upload error: ' + error.message });
    } else if (error) {
        return res.status(500).json({ success: false, message: 'Upload failed: ' + error.message });
    }
    next();
};
