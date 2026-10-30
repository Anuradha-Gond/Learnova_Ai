import mongoose from "mongoose";

// Enable MongoDB 4.2+ aggregation update pipelines across Mongoose queries
mongoose.set("updatePipeline", true);

/**
 * MongoDB Atlas & Mongoose Connection Layer
 *
 * Uses a module-level cached promise to prevent multiple connections
 * during Next.js hot-reload in development and across serverless invocations.
 *
 * Never expose MONGODB_URI to the client bundle.
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Only throw at call-time (connectDB), not at module parse time,
  // so the app can still start and return a clear error from API routes.
}

/**
 * Module-level cache. In development, `global` persists across HMR.
 * In production, module scope is sufficient.
 */
let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

/**
 * Returns a resolved Mongoose connection, creating one if needed.
 * @throws {Error} If MONGODB_URI is not configured.
 */
export async function connectDB() {
  const cache = global._mongooseCache || cached;

  // Return existing cached connection immediately (preserves test mocks)
  if (cache?.conn) {
    return cache.conn;
  }

  // If mongoose already has an active, ready connection, return immediately
  if (mongoose.connection?.readyState === 1) {
    cache.conn = mongoose;
    return cache.conn;
  }

  const uri = process.env.MONGODB_URI || MONGODB_URI;
  if (!uri) {
    throw new Error(
      "[Learnova] MONGODB_URI environment variable is not set. " +
        "Add it to .env.local before using database features."
    );
  }

  // 2. If a connection is already in progress, await the existing promise
  if (mongoose.connection?.readyState === 2 && cache.promise) {
    cache.conn = await cache.promise;
    return cache.conn;
  }

  // 3. Create a new connection promise if not connecting or if disconnected
  if (!cache.promise || mongoose.connection?.readyState === 0 || mongoose.connection?.readyState === 3) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    };

    cache.conn = null;
    cache.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        cache.conn = mongooseInstance;
        return mongooseInstance;
      })
      .catch((err) => {
        // Reset promise so the next call retries cleanly
        cache.promise = null;
        cache.conn = null;
        throw err;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    cache.conn = null;
    throw err;
  }

  return cache.conn;
}

/**
 * Returns whether MongoDB connection environment is configured.
 */
export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export const dbConfig = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  bufferCommands: false,
};
