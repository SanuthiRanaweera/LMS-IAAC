import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer = null;

async function connectInMemoryDb() {
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create();
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(memoryServer.getUri('lms'));

  // eslint-disable-next-line no-console
  console.warn('MongoDB Atlas unavailable; using in-memory MongoDB for development');
  return true;
}

export async function connectDb() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return connectInMemoryDb();
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(mongoUri);

    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('MongoDB connection failed:', err?.message || err);
    if (process.env.MONGODB_REQUIRED === 'true') {
      throw err;
    }
    return connectInMemoryDb();
  }
}

export async function closeDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
