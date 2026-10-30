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
  // Return existing connection immediately
  if (cache?.conn) {
    return cache.conn;
  }

  const uri = process.env.MONGODB_URI || MONGODB_URI;
  if (!uri) {
    throw new Error(
      "[Learnova] MONGODB_URI environment variable is not set. " +
        "Add it to .env.local before using database features."
    );
  }

  // Reuse an in-flight connection promise
  if (!cache.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    };

    cache.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      })
      .catch((err) => {
        // Reset promise so the next call retries
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
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
