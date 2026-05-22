import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { AIChat } from '../models/AIChat';
import { env } from '../config/env';

export const sendAIMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId ?? (req.user as any)?._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized.' });
            return;
        }
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

        // Lưu MongoDB chatId trước khi gọi Lambda để có session_id ổn định
        // Với chat mới chưa có _id, cần save() trước để Mongoose tạo ObjectId
        if (!chatId) {
            await aiChat.save();
        }

        const sessionId = aiChat._id.toString();

        const apiGatewayUrl = env.AWS_RAG_API_URL || 'https://rud5xb87cg.execute-api.us-west-2.amazonaws.com/default/W6-agent-retrieve';

        const response = await fetch(apiGatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: message.trim(),
                session_id: sessionId, // Truyền session_id để Lambda ghi/đọc DynamoDB đúng sơ đồ
            }),
        });

        if (!response.ok) {
            throw new Error(`AWS API Gateway returned HTTP ${response.status}`);
        }

        const responseData = (await response.json()) as { answer?: string; sources?: any[] };
        const aiResponse = responseData.answer || 'Không có câu trả lời nào từ hệ thống tri thức.';
        const rawSources = responseData.sources || [];

        // Map sources to avoid duplicate objects
        const mappedSources: any[] = [];
        rawSources.forEach((src: any) => {
            const sourceText = typeof src === 'string'
                ? src
                : (src.snippet || src.text || src.content?.text || src.location?.s3Location?.uri || '');
            
            const s3Uri = typeof src === 'string'
                ? null
                : (src.location?.s3Location?.uri || null);

            const isDuplicate = mappedSources.some(
                s => (s3Uri && s.location?.s3Location?.uri === s3Uri) || s.text === sourceText
            );

            if (!isDuplicate && sourceText) {
                mappedSources.push({
                    text: sourceText,
                    location: s3Uri ? { s3Location: { uri: s3Uri } } : undefined,
                });
            }
        });

        aiChat.messages.push({
            role: 'assistant',
            content: aiResponse,
            sources: mappedSources.length > 0 ? mappedSources : undefined,
            createdAt: new Date(),
        });

        await aiChat.save();

        res.json({
            success: true,
            data: {
                chatId: aiChat._id,
                title: aiChat.title,
                response: aiResponse,
                sources: mappedSources,
            },
        });
    } catch (error: any) {
        console.error('AWS Bedrock Chat error:', error);

        if (!env.AWS_ACCESS_KEY_ID?.trim() || !env.AWS_SECRET_ACCESS_KEY?.trim()) {
            res.status(503).json({
                success: false,
                message: 'Tính năng AI chưa được cấu hình (thiếu thông tin xác thực AWS).',
            });
            return;
        }

        if (error?.name === 'AccessDeniedException' || error?.message?.includes('AccessDenied')) {
            res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập AWS Bedrock. Vui lòng kiểm tra quyền hạn của IAM User.',
            });
            return;
        }

        if (error?.name === 'ResourceNotFoundException' || error?.message?.includes('ResourceNotFound')) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy cụm Knowledge Base hoặc Model chỉ định trên AWS.',
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: error?.message || 'Không thể xử lý tin nhắn RAG Bedrock. Vui lòng thử lại.',
        });
    }
};

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId ?? (req.user as any)?._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized.' });
            return;
        }
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
        const userId = req.user?.userId ?? (req.user as any)?._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized.' });
            return;
        }
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
        const userId = req.user?.userId ?? (req.user as any)?._id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized.' });
            return;
        }
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
