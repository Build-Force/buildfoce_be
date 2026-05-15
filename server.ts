import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { connectDatabase } from './src/config/database';
import { env } from './src/config/env';
import routes from './src/routes';
import passport from './src/config/passport';
import { errorHandler, notFound } from './src/middlewares/errorHandler';
import { initializeSocket } from './src/socket';

const app = express();
const httpServer = createServer(app);

// Socket.io
const io = initializeSocket(httpServer);
app.set('io', io);

// Connect to database
connectDatabase();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(passport.initialize());

// Set UTF-8 encoding for all responses
app.use((_req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Health check and home routes
app.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'BuildForce Backend API is running!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (_req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const port = env.PORT;

if (process.env.NODE_ENV !== 'test' && require.main === module) {
    const host = '0.0.0.0';
    httpServer.listen(port as number, host, () => {
        console.log(`🚀 Server is running on ${host}:${port}`);
        console.log(`💬 Initialized BuildForce Backend`);
    });
}

export default app;
