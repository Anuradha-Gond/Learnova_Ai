"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Client-side NextAuth Session Provider wrapper.
 * Provides useSession(), signIn(), signOut() access throughout the component tree.
 */
export default function AuthProvider({ children, session }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
