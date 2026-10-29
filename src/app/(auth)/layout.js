"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-brand-500/30 selection:text-brand-200">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand & Back to Home */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4 px-4 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Learnova AI Home</span>
        </Link>

        <div className="flex justify-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-xl tracking-tight text-white">
                Learnova <span className="text-brand-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase -mt-1">
                Personalized Learning
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {children}
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Protected by server-side bcrypt encryption & secure JWT session management.
        </p>
      </div>
    </div>
  );
}
