import mongoose from 'mongoose';
import { env } from './environment';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);

  try {
    // 1. Attempt connection to primary configured URI (e.g. localhost:27017 or Docker)
    console.log(`🔌 Connecting to MongoDB at ${env.MONGODB_URI}...`);
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (initialErr) {
    console.warn('⚠️ Could not connect to external MongoDB. Initializing high-speed embedded MongoMemoryServer fallback...');
    
    try {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: env.MONGODB_DB_NAME
        }
      });
      const memoryUri = memoryServer.getUri();
      console.log(`⚡ Embedded MongoDB running at: ${memoryUri}`);

      const conn = await mongoose.connect(memoryUri, {
        dbName: env.MONGODB_DB_NAME,
        autoIndex: true
      });

      console.log(`✅ Connected to Embedded MongoDB`);
      return conn;
    } catch (memErr) {
      console.error('❌ Failed to start embedded MongoDB:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
  console.log('🔌 MongoDB Disconnected');
}
