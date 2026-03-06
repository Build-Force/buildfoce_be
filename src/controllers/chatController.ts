import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';

const getAuthUserId = (req: AuthRequest): string => {
    const rawId =
        (req.user as any)?._id ??
        (req.user as any)?.userId;

    if (typeof rawId === 'string') {
        return rawId;
    }

    return String(rawId);
};

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);

        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'firstName lastName avatar role companyName')
            .sort({ updatedAt: -1 })
            .lean();

        const result = conversations.map((conv) => {
            const otherParticipant = conv.participants.find(
                (p: any) => p._id.toString() !== userId
            );
            const unreadMap = conv.unreadCount as any;
            const unread = unreadMap?.[userId] ?? 0;
            return {
                _id: conv._id,
                participant: otherParticipant,
                lastMessage: conv.lastMessage,
                unreadCount: unread,
                updatedAt: conv.updatedAt,
            };
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Failed to get conversations.' });
    }
};

export const createOrGetConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const { participantId } = req.body;

        if (!participantId) {
            res.status(400).json({ success: false, message: 'participantId is required.' });
            return;
        }

        if (participantId === userId) {
            res.status(400).json({ success: false, message: 'Cannot create conversation with yourself.' });
            return;
        }

        const participant = await User.findById(participantId);
        if (!participant) {
            res.status(404).json({ success: false, message: 'Participant not found.' });
            return;
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [userId, participantId], $size: 2 },
        }).populate('participants', 'firstName lastName avatar role companyName');

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [userId, participantId],
                unreadCount: new Map(),
            });
            conversation = await Conversation.findById(conversation._id)
                .populate('participants', 'firstName lastName avatar role companyName');
        }

        res.json({ success: true, data: conversation });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create conversation.' });
    }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const { conversationId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found.' });
            return;
        }

        const skip = (page - 1) * limit;
        const messages = await Message.find({ conversationId })
            .populate('sender', 'firstName lastName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Message.countDocuments({ conversationId });

        res.json({
            success: true,
            data: {
                messages: messages.reverse(),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to get messages.' });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const { conversationId } = req.params;
        const { content, type = 'text' } = req.body;

        if (!content || typeof content !== 'string' || !content.trim()) {
            res.status(400).json({ success: false, message: 'Message content is required.' });
            return;
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found.' });
            return;
        }

        const message = await Message.create({
            conversationId,
            sender: userId,
            content: content.trim(),
            type,
            readBy: [userId],
        });

        conversation.lastMessage = {
            content: content.trim(),
            sender: new mongoose.Types.ObjectId(userId),
            createdAt: new Date(),
        };

        conversation.participants.forEach((pId) => {
            const pid = pId.toString();
            if (pid !== userId) {
                const current = conversation.unreadCount.get(pid) || 0;
                conversation.unreadCount.set(pid, current + 1);
            }
        });

        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName avatar')
            .lean();

        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('new_message', populatedMessage);

            conversation.participants.forEach((pId) => {
                const pid = pId.toString();
                if (pid !== userId) {
                    io.to(`user:${pid}`).emit('conversation_updated', {
                        conversationId,
                        lastMessage: conversation.lastMessage,
                        unreadCount: conversation.unreadCount.get(pid) || 0,
                    });
                }
            });
        }

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = getAuthUserId(req);
        const { conversationId } = req.params;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation not found.' });
            return;
        }

        await Message.updateMany(
            { conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        conversation.unreadCount.set(userId, 0);
        await conversation.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('messages_read', {
                conversationId,
                readBy: userId,
            });
        }

        res.json({ success: true, message: 'Messages marked as read.' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark as read.' });
    }
};
