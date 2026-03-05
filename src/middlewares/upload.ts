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

// Image file filter
const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

// Avatar upload middleware
export const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFileFilter,
});

// Multer error handler
export const handleUploadError = (error: any, _req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Max size is 5MB.' });
        }
        return res.status(400).json({ success: false, message: 'Upload error: ' + error.message });
    } else if (error) {
        return res.status(500).json({ success: false, message: 'Upload failed: ' + error.message });
    }
    next();
};
