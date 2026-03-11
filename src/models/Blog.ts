import mongoose, { Document, Schema, Types } from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const slugify = require('slugify') as (s: string, o?: { lower?: boolean; strict?: boolean }) => string;

export type BlogStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';

export interface IBlogAuthor {
    id: Types.ObjectId;
    name: string;
    avatar?: string;
    role: string;
}

export interface IBlogMedia {
    featuredImage: string;
    images?: string[];
    videos?: string[];
}

export interface IBlogInteract {
    views: number;
    likes: Types.ObjectId[];
    likesCount: number;
    commentsCount: number;
}

export interface ICommentReply {
    id?: string;
    content: string;
    author: IBlogAuthor;
    createdAt: Date;
    likes: Types.ObjectId[];
}

export interface IComment {
    id?: string;
    content: string;
    author: IBlogAuthor;
    createdAt: Date;
    likes: Types.ObjectId[];
    replies: ICommentReply[];
}

export interface IBlog extends Document {
    slug: string;
    title: string;
    content: string;
    author: IBlogAuthor;
    media: IBlogMedia;
    tags: string[];
    status: BlogStatus;
    interact: IBlogInteract;
    commentsList: IComment[];
    publishedAt?: Date;
    adminReview?: {
        reviewedBy?: Types.ObjectId;
        reason?: string;
        at?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const commentAuthorSchema = new Schema({
    id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    role: { type: String, required: true, default: 'user' },
}, { _id: false });

const commentReplySchema = new Schema({
    content: { type: String, required: true },
    author: { type: commentAuthorSchema, required: true },
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

const commentSchema = new Schema({
    content: { type: String, required: true },
    author: { type: commentAuthorSchema, required: true },
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    replies: [commentReplySchema],
});

const blogSchema = new Schema<IBlog>(
    {
        slug: {
            type: String,
            unique: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        author: {
            id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true },
            avatar: { type: String },
            role: { type: String, required: true, default: 'user' },
        },
        media: {
            featuredImage: { type: String, required: true },
            images: [{ type: String }],
            videos: [{ type: String }],
        },
        tags: [{ type: String, index: true }],
        status: {
            type: String,
            enum: ['draft', 'pending', 'approved', 'rejected', 'archived'],
            default: 'pending',
            index: true,
        },
        interact: {
            views: { type: Number, default: 0 },
            likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
            likesCount: { type: Number, default: 0 },
            commentsCount: { type: Number, default: 0 },
        },
        commentsList: [commentSchema],
        publishedAt: { type: Date },
        adminReview: {
            reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            reason: { type: String },
            at: { type: Date },
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to generate slug
blogSchema.pre('validate', async function (next) {
    if (!this.title || (this.slug && !this.isModified('title'))) {
        return next();
    }

    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Use loop to find a unique slug
    while (true) {
        const existingBlog = await mongoose.model('Blog').findOne({ slug, _id: { $ne: this._id } });
        if (!existingBlog) {
            this.slug = slug;
            break;
        }
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    next();
});

// Update counts when likes or comments change
blogSchema.pre('save', function (next) {
    if (this.isModified('interact.likes')) {
        this.interact.likesCount = this.interact.likes.length;
    }
    // Deep calculation for comments count (comments + total replies)
    let totalComments = this.commentsList.length;
    this.commentsList.forEach(comment => {
        totalComments += comment.replies.length;
    });
    this.interact.commentsCount = totalComments;

    next();
});

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ 'interact.views': -1 });
blogSchema.index({ 'interact.likesCount': -1 });

export const Blog = mongoose.model<IBlog>('Blog', blogSchema);
