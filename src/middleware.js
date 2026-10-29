import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

/**
 * Next.js App Router Route Protection Middleware
 *
 * Uses the built-in NextAuth middleware to protect private routes.
 * Unauthenticated requests to matched routes are redirected to /login.
 *
 * Public routes (landing, login, register, health, static assets) are
 * intentionally excluded from the matcher — they remain freely accessible.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/materials/:path*",
    "/assistant/:path*",
    "/quizzes/:path*",
    "/analytics/:path*",
    "/revision/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
