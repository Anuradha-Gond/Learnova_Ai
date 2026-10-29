import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Private File Storage Adapter — Cloudflare R2 / S3-Compatible
 *
 * Provides reusable upload, delete, and authorized download operations.
 * All credentials are read from server-only environment variables.
 *
 * The storage bucket is PRIVATE — no public access.
 * Authorized downloads use time-limited signed URLs generated server-side.
 *
 * DO NOT import this module in client components.
 * DO NOT accept arbitrary storage keys from users without owner verification.
 */

export const STORAGE_CONFIG = {
  maxFileSizeBytes: 15 * 1024 * 1024,   // 15 MB
  allowedExtensions: ["pdf", "txt"],
  uploadUrlExpiresSeconds: 600,           // 10 minutes
  viewUrlExpiresSeconds: 900,             // 15 minutes
};

export const REQUIRED_STORAGE_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
];

/**
 * Checks if a configuration value is missing or an unresolved placeholder.
 *
 * @param {string} val
 * @returns {boolean}
 */
export function isStoragePlaceholder(val) {
  if (!val || typeof val !== "string") return true;
  const trimmed = val.trim();
  return (
    trimmed === "" ||
    trimmed.includes("<") ||
    trimmed.includes(">") ||
    trimmed.toLowerCase().startsWith("your_") ||
    trimmed.toLowerCase().endsWith("_here") ||
    trimmed.toLowerCase().includes("placeholder")
  );
}

/**
 * Validates whether an S3 / R2 endpoint is a syntactically valid HTTP/HTTPS URL
 * without unresolved template variables.
 *
 * @param {string} endpoint
 * @returns {boolean}
 */
export function isValidStorageEndpoint(endpoint) {
  if (!endpoint || isStoragePlaceholder(endpoint)) return false;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.hostname.includes("<") || url.hostname.includes(">")) return false;
    if (url.hostname.toLowerCase().includes("your_")) return false;
    return Boolean(url.hostname && url.hostname.includes("."));
  } catch {
    return false;
  }
}

/**
 * Returns detailed diagnostic information about current storage configuration.
 *
 * @returns {{ isConfigured: boolean, missing: string[], placeholders: string[], endpointInvalid: boolean }}
 */
export function getStorageDiagnostics() {
  const missing = REQUIRED_STORAGE_VARS.filter((k) => !process.env[k]);
  const placeholders = REQUIRED_STORAGE_VARS.filter(
    (k) => process.env[k] && isStoragePlaceholder(process.env[k])
  );
  const endpoint = process.env.R2_ENDPOINT;
  const endpointInvalid = Boolean(endpoint && !isValidStorageEndpoint(endpoint));

  const isConfigured =
    missing.length === 0 &&
    placeholders.length === 0 &&
    !endpointInvalid &&
    Boolean(endpoint);

  return {
    isConfigured,
    missing,
    placeholders,
    endpointInvalid,
  };
}

/**
 * Validates that all required storage environment variables are present,
 * free of placeholders, and have a valid endpoint URL.
 * @throws {Error} if any required variable is missing, is a placeholder, or is invalid.
 */
function assertStorageConfigured() {
  const diag = getStorageDiagnostics();

  if (diag.missing.length > 0) {
    throw new Error(
      `[Learnova] Storage is not configured. Missing environment variables: ${diag.missing.join(", ")}. ` +
        "Add them to .env.local before using file storage features."
    );
  }

  if (diag.placeholders.length > 0) {
    throw new Error(
      `[Learnova] Storage configuration contains unresolved placeholders in: ${diag.placeholders.join(", ")}. ` +
        "Please provide real Cloudflare R2 credentials in .env.local."
    );
  }

  if (diag.endpointInvalid) {
    throw new Error(
      `[Learnova] Storage R2_ENDPOINT is invalid or contains unresolved placeholders: "${process.env.R2_ENDPOINT}". ` +
        "Must be a valid URL without brackets (e.g. https://<account_id>.r2.cloudflarestorage.com with your actual Cloudflare account ID)."
    );
  }
}

/**
 * Returns whether the storage adapter is fully configured with valid, non-placeholder credentials.
 * Safe to call at any time — does not throw.
 */
export function isStorageConfigured() {
  return getStorageDiagnostics().isConfigured;
}

/**
 * Creates and returns a configured S3Client for R2.
 * Throws if storage environment variables are not set.
 */
function getS3Client() {
  assertStorageConfigured();

  return new S3Client({
    region: "auto",  // R2 uses "auto" as the region
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Builds a deterministic, scoped storage path for a user document.
 * Ensures users can only access their own objects.
 *
 * @param {string} userId       - MongoDB ObjectId string of the owning user
 * @param {string} documentId   - MongoDB ObjectId string of the material document
 * @param {string} fileExtension - File extension without leading dot (e.g. "pdf")
 * @returns {string} Storage key e.g. "users/abc123/documents/def456.pdf"
 */
export function buildStorageKey(userId, documentId, fileExtension) {
  const sanitizedExt = fileExtension.replace(/^\./, "").toLowerCase();
  if (!["pdf", "txt"].includes(sanitizedExt)) {
    throw new Error(`Unsupported file extension: ${sanitizedExt}`);
  }
  return `users/${userId}/documents/${documentId}.${sanitizedExt}`;
}

/**
 * Uploads a file buffer to the private R2 bucket.
 *
 * @param {object} params
 * @param {string} params.storageKey   - Full storage key (from buildStorageKey)
 * @param {Buffer|Uint8Array} params.body - File content buffer
 * @param {string} params.contentType  - MIME type (e.g. "application/pdf")
 * @param {object} [params.metadata]   - Optional key-value metadata
 * @returns {Promise<void>}
 */
export async function uploadFile({ storageKey, body, contentType, metadata = {} }) {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: storageKey,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
    // No ACL — bucket is private by default on R2
  });
  await client.send(command);
}

/**
 * Generates a time-limited signed URL for downloading a private object.
 *
 * ALWAYS verify that the requesting user owns the resource before calling this.
 * Never generate signed URLs for arbitrary keys provided by users.
 *
 * @param {string} storageKey       - Full storage key of the object
 * @param {number} [expiresInSeconds] - URL expiry duration (default: 900s / 15min)
 * @returns {Promise<string>} Signed download URL
 */
export async function getSignedDownloadUrl(
  storageKey,
  expiresInSeconds = STORAGE_CONFIG.viewUrlExpiresSeconds
) {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: storageKey,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes an object from the private storage bucket.
 *
 * ALWAYS verify that the requesting user owns the resource before calling this.
 *
 * @param {string} storageKey - Full storage key of the object to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(storageKey) {
  try {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: storageKey,
    });
    await client.send(command);
  } catch (err) {
    // If the object is already missing from storage, treat as idempotent success
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return;
    }
    throw err;
  }
}

/**
 * Checks whether an object exists in the bucket without fetching its body.
 *
 * @param {string} storageKey - Full storage key to check
 * @returns {Promise<boolean>}
 */
export async function fileExists(storageKey) {
  try {
    const client = getS3Client();
    const command = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: storageKey,
    });
    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a text file object directly from the private bucket as UTF-8 string.
 * Used for previewing plain-text documents in the workspace.
 *
 * @param {string} storageKey - Full storage key
 * @param {number} [maxBytes=524288] - Maximum bytes to read (default 512 KB)
 * @returns {Promise<string>} Plain text contents
 */
export async function getFileText(storageKey, maxBytes = 512 * 1024) {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: storageKey,
  });

  const response = await client.send(command);
  if (!response.Body) {
    return "";
  }

  const stream = response.Body;
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of stream) {
    totalBytes += chunk.length;
    chunks.push(chunk);
    if (totalBytes >= maxBytes) {
      break;
    }
  }

  const buffer = Buffer.concat(chunks);
  return buffer.toString("utf-8");
}

/**
 * Reads a document buffer from the private storage bucket.
 * Used for server-side PDF and TXT text extraction pipelines.
 *
 * @param {string} storageKey - Full storage key
 * @returns {Promise<Buffer>} Document binary buffer
 */
export async function getFileBuffer(storageKey) {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: storageKey,
  });

  const response = await client.send(command);
  if (!response.Body) {
    throw new Error(`Storage object empty or missing for key: ${storageKey}`);
  }

  const stream = response.Body;
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}


