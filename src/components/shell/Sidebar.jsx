"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  HelpCircle,
  BarChart3,
  Flame,
  Settings,
  UserCircle,
  LogOut,
  X,
  Bot,
  History,
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Study Materials", href: "/materials", icon: BookOpen, badge: "M4" },
  { name: "AI Learning Assistant", href: "/assistant", icon: Bot, badge: "M6" },
  { name: "Quizzes", href: "/quizzes", icon: HelpCircle, badge: "Live" },
  { name: "Progress Analytics", href: "/analytics", icon: BarChart3, badge: "Live" },
  { name: "Revision Recommendations", href: "/revision", icon: Flame, badge: "Live" },
  { name: "Learning History", href: "/history", icon: History, badge: "Live" },
  { name: "Settings", href: "/settings", icon: Settings, badge: "Live" },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-extrabold text-base text-white">
                Learnova <span className="text-brand-400">AI</span>
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider -mt-0.5">
                Workspace
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Main Navigation
          </p>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group",
                  isActive
                    ? "bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive
                        ? "text-brand-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-900 border border-brand-700/60 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "S"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {session?.user?.name || "Student"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {session?.user?.email || "student@learnova.ai"}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Learnova AI v0.3</span>
            <span className="text-emerald-400 font-semibold">Active Session</span>
          </div>
        </div>
      </aside>
    </>
  );
}
