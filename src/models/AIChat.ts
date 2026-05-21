import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAIChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sources?: any[];
    createdAt: Date;
}

export interface IAIChat extends Document {
    userId: Types.ObjectId;
    messages: IAIChatMessage[];
    title: string;
    bedrockSessionId?: string;
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
    sources: {
        type: [Schema.Types.Mixed],
        default: undefined,
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
    bedrockSessionId: {
        type: String,
        required: false,
    },
}, {
    timestamps: true,
});

aiChatSchema.index({ userId: 1, updatedAt: -1 });

export const AIChat = mongoose.model<IAIChat>('AIChat', aiChatSchema);
