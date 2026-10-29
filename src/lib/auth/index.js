/**
 * Authentication & Authorization Configuration
 *
 * Session strategy and cookie configuration constants.
 * The concrete NextAuth handler lives in:
 *   src/app/api/auth/[...nextauth]/route.js
 *
 * Server-side route protection helpers live in:
 *   src/lib/auth/server.js
 */

export const authConfig = {
  sessionStrategy: "jwt",
  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
  cookieName: "next-auth.session-token",
};

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }

  toResponse() {
    return Response.json({ error: this.message }, { status: this.status });
  }
}

/**
 * Validates session ownership against resource tenant ID.
 */
export function verifyOwnership(resourceUserId, currentUserId) {
  if (!resourceUserId || !currentUserId) return false;
  return resourceUserId.toString() === currentUserId.toString();
}

/**
 * Asserts resource ownership. Throws 403 AuthError on mismatch.
 */
export function assertOwnership(resourceOwnerId, currentUserId) {
  if (!resourceOwnerId || !currentUserId) {
    throw new AuthError(403, "Access denied.");
  }
  if (resourceOwnerId.toString() !== currentUserId.toString()) {
    throw new AuthError(403, "You do not have permission to access this resource.");
  }
}

