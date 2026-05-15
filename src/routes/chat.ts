import { RequestHandler, Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import {
    getConversations,
    createOrGetConversation,
    getMessages,
    sendMessage,
    markAsRead,
} from '../controllers/chatController';

const router = Router();

router.get('/', authMiddleware as RequestHandler, getConversations as RequestHandler);
router.post('/', authMiddleware as RequestHandler, createOrGetConversation as RequestHandler);
router.get('/:conversationId/messages', authMiddleware as RequestHandler, getMessages as RequestHandler);
router.post('/:conversationId', authMiddleware as RequestHandler, sendMessage as RequestHandler);
router.put('/:conversationId/read', authMiddleware as RequestHandler, markAsRead as RequestHandler);

export default {
    router,
    path: '/chat',
};
