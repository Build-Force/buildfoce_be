import mongoose from 'mongoose';
import { env } from './env';

const isMongoAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: number; message?: string };
  return err.code === 8000 || err.message?.toLowerCase().includes('authentication failed') === true;
};

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

    if (isMongoAuthError(error)) {
      console.error('👉 MongoDB authentication failed. Please verify MONGODB_URI username/password and whitelist IP in MongoDB Atlas.');
    }

    const isProd = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';

    if (isProd && !isTest) {
      process.exit(1);
    }

    console.warn('⚠️ Running without database connection (non-production mode).');
  }
};
