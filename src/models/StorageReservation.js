import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

/**
 * StorageReservation Model
 *
 * Tracks individual capacity reservations during the upload lifecycle.
 * States:
 * - 'pending': Document created; awaiting atomic capacity allocation on StorageQuota.
 * - 'reserved': Capacity temporarily reserved on StorageQuota while uploading to R2.
 * - 'committed': Upload and DB metadata persisted; bytes transferred to usedBytes.
 * - 'released': Upload failed or cancelled; capacity restored.
 * - 'expired': Timed out before finalization; reconciled and restored.
 */
const StorageReservationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner userId is required"],
      index: true,
    },

    materialId: {
      type: Schema.Types.ObjectId,
      ref: "Material",
      default: null,
    },

    storageKey: {
      type: String,
      required: [true, "Storage key is required"],
      trim: true,
    },

    fileSizeBytes: {
      type: Number,
      required: [true, "File size in bytes is required"],
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending", "reserved", "committed", "released", "expired"],
      default: "pending",
      index: true,
    },

    quotaAllocated: {
      type: Boolean,
      default: false,
      index: true,
    },

    allocatedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
      // IMPORTANT: Do NOT add a MongoDB TTL index (e.g. `expires: ...` or `expireAfterSeconds`) to this field.
      // If MongoDB's background TTL monitor automatically deleted expired documents, the document would
      // vanish before `expireStaleReservations()` could subtract its `fileSizeBytes` from `StorageQuota.reservedBytes`,
      // which would cause a permanent reserved-byte accounting leak.
      // Expiration and capacity release MUST be handled via `expireStaleReservations()`.
    },

    finalizedAt: {
      type: Date,
      default: null,
    },

    quotaCommitted: {
      type: Boolean,
      default: false,
    },

    releasedAt: {
      type: Date,
      default: null,
    },

    quotaReleased: {
      type: Boolean,
      default: false,
    },

    releaseReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

StorageReservationSchema.index({ status: 1, expiresAt: 1 });
StorageReservationSchema.index({ storageKey: 1 });

const StorageReservation =
  models.StorageReservation || model("StorageReservation", StorageReservationSchema);

export default StorageReservation;

