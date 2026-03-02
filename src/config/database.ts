import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
    try {
        const mongoUri = env.MONGODB_URI;

        if (!mongoUri) {
            console.warn('⚠️ No MONGODB_URI provided in environment variables');
            return;
        }

        const mongooseOptions = {
            autoIndex: process.env.NODE_ENV !== 'production',
            serverSelectionTimeoutMS: 5000,
        };

        await mongoose.connect(mongoUri, mongooseOptions);
        console.log('✅ Successfully connected to MongoDB database');

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
        });

    } catch (error) {
        console.error('❌ Failed to connect to database', error);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
    }
};
