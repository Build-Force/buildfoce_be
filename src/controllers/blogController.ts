import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Blog } from '../models/Blog';
import { User } from '../models/User';
import cloudinary from '../config/cloudinary';
import mongoose from 'mongoose';

const getAuthUserId = (req: AuthRequest): string | undefined => {
    return req.user?.userId;
};

const getIo = (req: Request) => req.app.get('io');

// Cloudinary cleanup utility
const deleteCloudinaryAssets = async (media: any) => {
    try {
        const publicIds: string[] = [];
        if (media.featuredImage) {
            const parts = media.featuredImage.split('/');
            const publicId = parts[parts.length - 1].split('.')[0];
            publicIds.push(`buildforce/blogs/${publicId}`);
        }
        if (media.images && Array.isArray(media.images)) {
            media.images.forEach((img: string) => {
                const parts = img.split('/');
                const publicId = parts[parts.length - 1].split('.')[0];
                publicIds.push(`buildforce/blogs/${publicId}`);
            });
        }
        // Add video cleanup if needed
        if (publicIds.length > 0) {
            await cloudinary.api.delete_resources(publicIds);
        }
    } catch (error) {
        console.error('Cloudinary cleanup error:', error);
    }
};

export const getBlogs = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search, tag, sort, authorId, status } = req.query;
        const query: any = { status: status || 'approved' };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
            ];
        }

        if (tag) {
            query.tags = tag;
        }

        if (authorId) {
            query['author.id'] = authorId;
        }

        let sortQuery: any = { publishedAt: -1 };
        if (sort === 'popular') {
            sortQuery = { 'interact.views': -1 };
        } else if (sort === 'likes') {
            sortQuery = { 'interact.likesCount': -1 };
        }

        const blogs = await Blog.find(query)
            .sort(sortQuery)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        const total = await Blog.countDocuments(query);

        return res.json({
            success: true,
            data: blogs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getBlogBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const blog = await Blog.findOneAndUpdate(
            { slug },
            { $inc: { 'interact.views': 1 } },
            { new: true }
        ).lean();

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        return res.json({ success: true, data: blog });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createBlog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { title, content, media, tags } = req.body;

        const blog = new Blog({
            title,
            content,
            author: {
                id: userId,
                name: `${user.firstName} ${user.lastName || ''}`.trim(),
                avatar: user.avatar,
            },
            media,
            tags,
            status: 'pending',
        });

        await blog.save();

        const io = getIo(req);
        if (io) {
            io.to('admin_room').emit('new_blog_pending', {
                blogId: blog._id,
                title: blog.title,
                author: blog.author.name
            });
        }

        return res.status(201).json({ success: true, data: blog });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateBlog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        const { id } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        if (blog.author.id.toString() !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const updates = req.body;
        // Don't allow manual update of auto-fields
        delete updates.slug;
        delete updates.author;
        delete updates.interact;
        delete updates.commentsList;

        Object.assign(blog, updates);

        // Reset status to pending if updated by author
        if (req.user?.role !== 'ADMIN') {
            blog.status = 'pending';
            blog.adminReview = undefined;
        }

        await blog.save();

        return res.json({ success: true, data: blog });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteBlog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        const { id } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        if (blog.author.id.toString() !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        await deleteCloudinaryAssets(blog.media);
        await blog.deleteOne();

        return res.json({ success: true, message: 'Blog deleted successfully' });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const likeBlog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { id } = req.params;
        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        const likeIndex = blog.interact.likes.findIndex(l => l.toString() === userId);
        if (likeIndex > -1) {
            blog.interact.likes.splice(likeIndex, 1);
        } else {
            blog.interact.likes.push(new mongoose.Types.ObjectId(userId));
        }

        await blog.save();
        return res.json({ success: true, likesCount: blog.interact.likesCount, isLiked: likeIndex === -1 });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const commentBlog = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { id } = req.params;
        const { content } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        blog.commentsList.push({
            content,
            author: {
                id: new mongoose.Types.ObjectId(userId),
                name: `${user.firstName} ${user.lastName || ''}`.trim(),
                avatar: user.avatar,
            },
            createdAt: new Date(),
            likes: [],
            replies: [],
        } as any);

        await blog.save();
        return res.json({ success: true, data: blog.commentsList[blog.commentsList.length - 1] });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const replyComment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { id, commentId } = req.params;
        const { content } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        const comment = (blog.commentsList as any).id(commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        comment.replies.push({
            content,
            author: {
                id: new mongoose.Types.ObjectId(userId),
                name: `${user.firstName} ${user.lastName || ''}`.trim(),
                avatar: user.avatar,
            },
            createdAt: new Date(),
            likes: [],
        } as any);

        await blog.save();
        return res.json({ success: true, data: comment.replies[comment.replies.length - 1] });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateComment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { id, commentId } = req.params;
        const { content } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        const comment = (blog.commentsList as any).id(commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        if (comment.author.id.toString() !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        comment.content = content;
        await blog.save();

        return res.json({ success: true, data: comment });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { id, commentId } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        const comment = (blog.commentsList as any).id(commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        if (comment.author.id.toString() !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        (blog.commentsList as any).pull(commentId);
        await blog.save();

        return res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateReply = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { id, commentId, replyId } = req.params;
        const { content } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        const comment = (blog.commentsList as any).id(commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        const reply = (comment.replies as any).id(replyId);
        if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

        if (reply.author.id.toString() !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        reply.content = content;
        await blog.save();

        return res.json({ success: true, data: reply });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteReply = async (req: AuthRequest, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { id, commentId, replyId } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        const comment = (blog.commentsList as any).id(commentId);
        if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

        const reply = (comment.replies as any).id(replyId);
        if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

        if (reply.author.id.toString() !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        (comment.replies as any).pull(replyId);
        await blog.save();

        return res.json({ success: true, message: 'Reply deleted successfully' });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const approveBlog = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });

        const { id } = req.params;
        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        blog.status = 'approved';
        blog.publishedAt = blog.publishedAt || new Date();
        blog.adminReview = {
            reviewedBy: new mongoose.Types.ObjectId(req.user.userId),
            at: new Date(),
        };

        await blog.save();

        const io = getIo(req);
        if (io) {
            io.emit('blog_approved', {
                slug: blog.slug,
                title: blog.title,
                author: blog.author.name
            });
        }

        return res.json({ success: true, data: blog });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const rejectBlog = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });

        const { id } = req.params;
        const { reason } = req.body;
        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

        blog.status = 'rejected';
        blog.adminReview = {
            reviewedBy: new mongoose.Types.ObjectId(req.user.userId),
            reason,
            at: new Date(),
        };

        await blog.save();
        return res.json({ success: true, data: blog });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
