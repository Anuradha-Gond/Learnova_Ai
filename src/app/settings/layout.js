"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Sidebar from "@/components/shell/Sidebar";
import { Sparkles, Menu, LogOut, Settings } from "lucide-react";

export default function SettingsLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500/30 selection:text-brand-200">
      {/* Workspace Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Layout Wrapper */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-sm text-white">
                Learnova <span className="text-brand-400">AI</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-2 text-xs">
              <Link
                href="/dashboard"
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                Workspace
              </Link>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-white">Account Settings</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-brand-900 border border-brand-700/60 flex items-center justify-center text-brand-300 text-xs font-bold">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "S"}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-200">
                {session?.user?.name || "Student"}
              </span>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors ml-1"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Settings Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
