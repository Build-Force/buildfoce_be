import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface AuthenticatedSocket extends Socket {
    userId?: string;
}

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: env.FRONTEND_URL,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded: any = jwt.verify(token, env.JWT_SECRET);
            socket.userId = decoded._id;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.userId;
        if (!userId) return;

        socket.join(`user:${userId}`);
        console.log(`User ${userId} connected via Socket.io`);

        socket.on('join_conversation', (conversationId: string) => {
            socket.join(`conversation:${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
        });

        socket.on('typing', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
                conversationId: data.conversationId,
                userId,
            });
        });

        socket.on('stop_typing', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user_stop_typing', {
                conversationId: data.conversationId,
                userId,
            });
        });

        // Blog: Admin joins admin room for real-time notifications
        socket.on('join_admin_room', () => {
            socket.join('admin_room');
        });

        // Blog: Subscribe to blog updates
        socket.on('subscribe_blog_updates', () => {
            socket.join('blog_updates');
        });

        socket.on('disconnect', () => {
            console.log(`User ${userId} disconnected`);
        });
    });

    return io;
};
