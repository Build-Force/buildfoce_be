import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAIChatMessage {
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

export interface IAIChat extends Document {
    userId: Types.ObjectId;
    messages: IAIChatMessage[];
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

const aiChatMessageSchema = new Schema<IAIChatMessage>({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const aiChatSchema = new Schema<IAIChat>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    messages: [aiChatMessageSchema],
    title: {
        type: String,
        default: 'Cuộc trò chuyện mới',
    },
}, {
    timestamps: true,
});

aiChatSchema.index({ userId: 1, updatedAt: -1 });

export const AIChat = mongoose.model<IAIChat>('AIChat', aiChatSchema);
