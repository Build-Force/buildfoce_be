import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuthRequest } from '../middlewares/auth';
import { AIChat } from '../models/AIChat';
import { env } from '../config/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `Bạn là BuildForce AI Assistant — trợ lý thông minh của nền tảng BuildForce, chuyên kết nối nhân lực ngành xây dựng.

Nhiệm vụ của bạn:
- Hỗ trợ người lao động (thợ xây, thợ điện, thợ sơn, kỹ sư...) tìm việc phù hợp
- Hỗ trợ nhà tuyển dụng (HR) tìm ứng viên, đăng tin tuyển dụng
- Trả lời câu hỏi về ngành xây dựng, kỹ năng, mức lương, an toàn lao động
- Hướng dẫn sử dụng nền tảng BuildForce

Quy tắc:
- Trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp
- Trả lời ngắn gọn, dễ hiểu
- Nếu không biết, hãy nói rõ và gợi ý người dùng liên hệ hỗ trợ`;

export const sendAIMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        const { message, chatId } = req.body;

        if (!message || typeof message !== 'string' || !message.trim()) {
            res.status(400).json({ success: false, message: 'Message is required.' });
            return;
        }

        let aiChat;
        if (chatId) {
            aiChat = await AIChat.findOne({ _id: chatId, userId });
            if (!aiChat) {
                res.status(404).json({ success: false, message: 'Chat session not found.' });
                return;
            }
        } else {
            aiChat = new AIChat({
                userId,
                title: message.trim().substring(0, 60),
                messages: [],
            });
        }

        aiChat.messages.push({
            role: 'user',
            content: message.trim(),
            createdAt: new Date(),
        });

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const chatHistory = aiChat.messages.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Tôi hiểu. Tôi là BuildForce AI Assistant, sẵn sàng hỗ trợ bạn!' }] },
                ...chatHistory.slice(0, -1),
            ],
        });

        const result = await chat.sendMessage(message.trim());
        const aiResponse = result.response.text();

        aiChat.messages.push({
            role: 'assistant',
            content: aiResponse,
            createdAt: new Date(),
        });

        await aiChat.save();

        res.json({
            success: true,
            data: {
                chatId: aiChat._id,
                title: aiChat.title,
                response: aiResponse,
            },
        });
    } catch (error: any) {
        console.error('AI Chat error:', error);

        if (error?.status === 429 || error?.message?.includes('429')) {
            res.status(429).json({
                success: false,
                message: 'AI đang quá tải, vui lòng thử lại sau ít phút.',
            });
            return;
        }

        res.status(500).json({ success: false, message: 'Failed to get AI response.' });
    }
};

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        const chats = await AIChat.find({ userId })
            .select('title messages createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .lean();

        const chatList = chats.map((chat) => ({
            _id: chat._id,
            title: chat.title,
            lastMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content : '',
            messageCount: chat.messages.length,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
        }));

        res.json({ success: true, data: chatList });
    } catch (error) {
        console.error('Get AI chat history error:', error);
        res.status(500).json({ success: false, message: 'Failed to get chat history.' });
    }
};

export const getChatById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        const { chatId } = req.params;

        const chat = await AIChat.findOne({ _id: chatId, userId });
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat session not found.' });
            return;
        }

        res.json({ success: true, data: chat });
    } catch (error) {
        console.error('Get AI chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to get chat.' });
    }
};

export const deleteChat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;
        const { chatId } = req.params;

        const chat = await AIChat.findOneAndDelete({ _id: chatId, userId });
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat session not found.' });
            return;
        }

        res.json({ success: true, message: 'Chat deleted successfully.' });
    } catch (error) {
        console.error('Delete AI chat error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete chat.' });
    }
};
