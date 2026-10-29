import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/index.js";
import User from "@/models/User.js";

/**
 * NextAuth v4 configuration for Learnova AI.
 *
 * Strategy: Credentials (email + password) + JWT sessions.
 * No database adapter — user lookup is performed manually in the authorize callback.
 * JWT contains minimal claims (id, email, name, role) — never the password hash.
 */

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectDB();

        // Fetch user with password hash (normally excluded via select:false)
        const user = await User.findOne({
          email: credentials.email.toLowerCase().trim(),
        }).select("+password");

        if (!user) {
          // Same message for both not-found and wrong password (prevents enumeration)
          throw new Error("Invalid email or password");
        }

        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          throw new Error("This account has been deactivated");
        }

        // Return only safe fields — this object becomes the JWT payload
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  callbacks: {
    /**
     * Persist safe user fields into the JWT token.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    /**
     * Expose safe fields to the client session object.
     * Never include password or sensitive internal fields.
     */
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...(session.user || {}),
          id: token.id,
          role: token.role,
        };
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",  // Redirect auth errors to login page
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
