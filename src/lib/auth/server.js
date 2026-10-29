import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route.js";

/**
 * Server-side authentication helpers for Learnova AI route handlers.
 *
 * These functions are server-only — never import them in client components.
 * They form the authorization foundation for all protected API routes.
 */

/**
 * Resolves the currently authenticated user session.
 * Returns null if the user is not authenticated.
 *
 * @returns {Promise<import("next-auth").Session | null>}
 */
export async function getAuthSession() {
  return getServerSession(authOptions);
}

/**
 * Resolves the authenticated session and throws a structured Response
 * if the user is not authenticated. Use at the top of every protected
 * route handler.
 *
 * @returns {Promise<{ id: string, email: string, name: string, role: string }>}
 * @throws {Response} 401 JSON response if unauthenticated
 *
 * @example
 * export async function GET(req) {
 *   const currentUser = await requireAuth();
 *   // currentUser.id is a verified user ID string
 * }
 */
export async function requireAuth() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    throw new AuthError(401, "Authentication required. Please sign in.");
  }

  return session.user;
}

/**
 * Verifies that a resource's ownerUserId matches the current user's ID.
 * Throws a 403 if there is a mismatch.
 *
 * Never rely on client-provided ownership claims — always verify against DB.
 *
 * @param {string} resourceOwnerId - The userId stored on the resource document
 * @param {string} currentUserId   - The authenticated user's ID from session
 * @throws {Response} 403 JSON response if unauthorized
 */
export function assertOwnership(resourceOwnerId, currentUserId) {
  if (!resourceOwnerId || !currentUserId) {
    throw new AuthError(403, "Access denied.");
  }
  if (resourceOwnerId.toString() !== currentUserId.toString()) {
    throw new AuthError(403, "You do not have permission to access this resource.");
  }
}

/**
 * Structured error class used to return auth failure HTTP responses
 * from route handlers that catch this type.
 */
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
 * Convenience wrapper that catches AuthError and returns the appropriate
 * HTTP response. Wrap route handler bodies with this to reduce boilerplate.
 *
 * @param {Function} handler - Async route handler function
 * @returns {Function} Wrapped handler
 *
 * @example
 * export const GET = withAuth(async (req) => {
 *   const user = await requireAuth();
 *   // ...
 * });
 */
export function withAuth(handler) {
  return async function (req, context) {
    try {
      return await handler(req, context);
    } catch (err) {
      if (err instanceof AuthError) {
        return err.toResponse();
      }
      throw err;
    }
  };
}

/**
 * Reexported for backward compatibility with existing verifyOwnership calls
 * in src/lib/auth/index.js.
 */
export function verifyOwnership(resourceUserId, currentUserId) {
  if (!resourceUserId || !currentUserId) return false;
  return resourceUserId.toString() === currentUserId.toString();
}
