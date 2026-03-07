import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import * as blogController from '../controllers/blogController';
import { authenticateToken } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { uploadBlogImage, uploadBlogVideo, handleUploadError } from '../middlewares/upload';

const router = Router();

// Public routes
router.get('/', blogController.getBlogs);
router.get('/:slug', blogController.getBlogBySlug);

// Media upload routes
router.post(
    '/upload/image',
    authenticateToken,
    uploadBlogImage.single('image'),
    handleUploadError,
    (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }
        return res.json({
            success: true,
            data: { url: (req.file as any).path || (req.file as any).secure_url },
        });
    }
);

router.post(
    '/upload/video',
    authenticateToken,
    uploadBlogVideo.single('video'),
    handleUploadError,
    (req: Request, res: Response) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No video file provided' });
        }
        return res.json({
            success: true,
            data: { url: (req.file as any).path || (req.file as any).secure_url },
        });
    }
);

// Protected routes
router.post(
    '/',
    authenticateToken,
    validate([
        body('title').trim().notEmpty().withMessage('Tiêu đề không được để trống'),
        body('content').notEmpty().withMessage('Nội dung không được để trống'),
        body('media.featuredImage').notEmpty().withMessage('Ảnh đại diện là bắt buộc'),
    ]),
    blogController.createBlog
);

router.patch('/:id', authenticateToken, blogController.updateBlog);
router.delete('/:id', authenticateToken, blogController.deleteBlog);
router.post('/:id/like', authenticateToken, blogController.likeBlog);

router.post(
    '/:id/comment',
    authenticateToken,
    validate([
        body('content').trim().notEmpty().withMessage('Nội dung bình luận không được để trống'),
    ]),
    blogController.commentBlog
);

router.post(
    '/:id/comment/:commentId/reply',
    authenticateToken,
    validate([
        body('content').trim().notEmpty().withMessage('Nội dung phản hồi không được để trống'),
    ]),
    blogController.replyComment
);

// Admin routes
router.patch('/:id/approve', authenticateToken, blogController.approveBlog);
router.patch(
    '/:id/reject',
    authenticateToken,
    validate([
        body('reason').trim().notEmpty().withMessage('Lý do từ chối không được để trống'),
    ]),
    blogController.rejectBlog
);

export default {
    router,
    path: '/blogs',
};
