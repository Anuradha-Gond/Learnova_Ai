import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

// Enable MongoDB aggregation update pipelines on Mongoose queries
mongoose.set("updatePipeline", true);

export const MAX_TOTAL_STORAGE_BYTES = 8_500_000_000; // 8.5 GB decimal
export const MAX_FILE_SIZE_BYTES = 20_000_000; // 20 MB decimal

/**
 * StorageQuota Model
 *
 * Singleton model tracking application-wide Cloudflare R2 storage usage.
 * - Enforces invariant: usedBytes + reservedBytes + incomingFileBytes <= 8,500,000,000
 * - Atomically updated via findOneAndUpdate with $expr
 */
const StorageQuotaSchema = new Schema(
  {
    _id: {
      type: String,
      default: "global_storage_quota",
    },

    maxStorageBytes: {
      type: Number,
      default: MAX_TOTAL_STORAGE_BYTES,
      required: true,
    },

    usedBytes: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    reservedBytes: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    lastReconciledAt: {
      type: Date,
      default: null,
    },

    version: {
      type: Number,
      default: 0,
      min: 0,
    },

    activeReservations: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const StorageQuota = models.StorageQuota || model("StorageQuota", StorageQuotaSchema);

export default StorageQuota;

