import mongoose from "mongoose";
const { Schema, models, model } = mongoose;
import bcrypt from "bcryptjs";

/**
 * User Model
 *
 * Stores student identity, hashed password, and profile settings.
 * Passwords are NEVER stored as plaintext — always bcrypt-hashed.
 * Password hash is excluded from all public query results via `select: false`.
 */

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name must be 100 characters or fewer"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,      // Normalized on write
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
      maxlength: [254, "Email must be 254 characters or fewer"],
    },

    // Password hash — excluded from normal queries
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,        // Never returned unless explicitly requested
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    // Profile
    academicLevel: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    targetExam: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,       // createdAt, updatedAt
    versionKey: false,
  }
);

/**
 * Hash password before save if it has been modified.
 * Uses bcrypt with 12 salt rounds.
 * Note: Mongoose async pre-hooks return a Promise and do not accept a `next` callback.
 */
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compares a plaintext candidate with the stored hash.
 * Requires the password field to be explicitly selected first.
 */
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Returns a safe public representation of the user (no password hash).
 */
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Prevent OverwriteModelError in Next.js hot-reload
const User = models.User || model("User", UserSchema);

export default User;
