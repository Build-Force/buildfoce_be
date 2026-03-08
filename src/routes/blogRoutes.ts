import { RequestHandler, Router, Request, Response } from 'express';
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
    authenticateToken as RequestHandler,
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
    authenticateToken as RequestHandler,
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
    authenticateToken as RequestHandler,
    validate([
        body('title').trim().notEmpty().withMessage('Tiêu đề không được để trống'),
        body('content').notEmpty().withMessage('Nội dung không được để trống'),
        body('media.featuredImage').notEmpty().withMessage('Ảnh đại diện là bắt buộc'),
    ]),
    blogController.createBlog as RequestHandler
);

router.patch('/:id', authenticateToken as RequestHandler, blogController.updateBlog as RequestHandler);
router.delete('/:id', authenticateToken as RequestHandler, blogController.deleteBlog as RequestHandler);
router.post('/:id/like', authenticateToken as RequestHandler, blogController.likeBlog as RequestHandler);

router.post(
    '/:id/comment',
    authenticateToken as RequestHandler,
    validate([
        body('content').trim().notEmpty().withMessage('Nội dung bình luận không được để trống'),
    ]),
    blogController.commentBlog as RequestHandler
);

router.post(
    '/:id/comment/:commentId/reply',
    authenticateToken as RequestHandler,
    validate([
        body('content').trim().notEmpty().withMessage('Nội dung phản hồi không được để trống'),
    ]),
    blogController.replyComment as RequestHandler
);

// Admin routes
router.patch('/:id/approve', authenticateToken as RequestHandler, blogController.approveBlog as RequestHandler);
router.patch(
    '/:id/reject',
    authenticateToken as RequestHandler,
    validate([
        body('reason').trim().notEmpty().withMessage('Lý do từ chối không được để trống'),
    ]),
    blogController.rejectBlog as RequestHandler
);

export default {
    router,
    path: '/blogs',
};
