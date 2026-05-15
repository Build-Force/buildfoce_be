import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage extends Document {
    conversationId: Types.ObjectId;
    sender: Types.ObjectId;
    content: string;
    type: 'text' | 'image' | 'file';
    readBy: Types.ObjectId[];
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text',
    },
    readBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
}, {
    timestamps: { createdAt: true, updatedAt: false },
});

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
