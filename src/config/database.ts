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

    const mongooseOptions: mongoose.ConnectOptions = {
      autoIndex: process.env.NODE_ENV !== 'production',

      // tăng timeout
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,

      // DocumentDB TLS
      tls: true,
      tlsCAFile: '/opt/buildforce/global-bundle.pem',

      // DocumentDB compatibility
      retryWrites: false,
      directConnection: false,
      family: 4,
    };

    await mongoose.connect(mongoUri, mongooseOptions);

    console.log('✅ Successfully connected to Amazon DocumentDB');

    try {
      const coll = mongoose.connection.db?.collection('jobs');

      if (coll) {
        const indexes = await coll.indexes();

        const geoIdx = indexes.find(
          (i: { key?: Record<string, unknown> }) =>
            i.key && (i.key as any).location === '2dsphere'
        );

        if (geoIdx?.name) {
          await coll.dropIndex(geoIdx.name);
          console.log('✅ Dropped legacy geo index on jobs.location');
        }
      }
    } catch {
      // ignore
    }

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

  } catch (error) {
    console.error('❌ Failed to connect to database', error);

    if (isMongoAuthError(error)) {
      console.error('👉 DocumentDB authentication failed. Check username/password.');
    }

    const isProd = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';

    if (isProd && !isTest) {
      process.exit(1);
    }

    console.warn('⚠️ Running without database connection (non-production mode).');
  }
};