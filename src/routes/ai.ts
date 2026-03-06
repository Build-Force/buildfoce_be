import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import {
    sendAIMessage,
    getChatHistory,
    getChatById,
    deleteChat,
} from '../controllers/aiController';

const router = Router();

router.post('/chat', authMiddleware, sendAIMessage);
router.get('/chat/history', authMiddleware, getChatHistory);
router.get('/chat/:chatId', authMiddleware, getChatById);
router.delete('/chat/:chatId', authMiddleware, deleteChat);

export default {
    router,
    path: '/ai',
};
