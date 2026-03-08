import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import {
    getConversations,
    createOrGetConversation,
    getMessages,
    sendMessage,
    markAsRead,
} from '../controllers/chatController';

const router = Router();

router.get('/', authMiddleware, getConversations);
router.post('/', authMiddleware, createOrGetConversation);
router.get('/:conversationId/messages', authMiddleware, getMessages);
router.post('/:conversationId', authMiddleware, sendMessage);
router.put('/:conversationId/read', authMiddleware, markAsRead);

export default {
    router,
    path: '/chat',
};
