import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILastMessage {
    content: string;
    sender: Types.ObjectId;
    createdAt: Date;
}

export interface IConversation extends Document {
    participants: Types.ObjectId[];
    lastMessage?: ILastMessage;
    unreadCount: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    lastMessage: {
        content: { type: String },
        sender: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date },
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: {},
    },
}, {
    timestamps: true,
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
