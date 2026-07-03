import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL!;

if (!MONGO_URL) {
  throw new Error('MONGO_URL environment variable is not set');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URL, {
      dbName: 'asknatural_quizzes',
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
