import { RequestHandler, Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import {
    sendAIMessage,
    getChatHistory,
    getChatById,
    deleteChat,
} from '../controllers/aiController';

const router = Router();

router.post('/chat', authMiddleware as RequestHandler, sendAIMessage as RequestHandler);
router.get('/chat/history', authMiddleware as RequestHandler, getChatHistory as RequestHandler);
router.get('/chat/:chatId', authMiddleware as RequestHandler, getChatById as RequestHandler);
router.delete('/chat/:chatId', authMiddleware as RequestHandler, deleteChat as RequestHandler);

export default {
    router,
    path: '/ai',
};
