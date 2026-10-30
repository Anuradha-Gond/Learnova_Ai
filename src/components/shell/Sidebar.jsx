"use client";

import React, { useEffect } from "react";
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
  LogOut,
  X,
  Bot,
  History,
} from "lucide-react";

const mainNavigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Learning Library", href: "/materials", icon: BookOpen },
  { name: "AI Study Assistant", href: "/assistant", icon: Bot },
  { name: "Practice Quizzes", href: "/quizzes", icon: HelpCircle },
];

const insightsNavigation = [
  { name: "Learning Insights", href: "/analytics", icon: BarChart3 },
  { name: "Revision Plan", href: "/revision", icon: Flame },
  { name: "Learning Activity", href: "/history", icon: History },
  { name: "Preferences", href: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const isItemActive = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderNavGroup = (title, items) => (
    <div className="space-y-1">
      <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative",
              active
                ? "bg-brand-500/15 text-white font-bold border border-brand-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  active
                    ? "text-brand-400"
                    : "text-slate-400 group-hover:text-slate-200"
                )}
              />
              <span>{item.name}</span>
            </div>
            {active && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            )}
          </Link>
        );
      })}
    </div>
  );

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
        <div className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          {renderNavGroup("Study Workspace", mainNavigation)}
          {renderNavGroup("Insights & Planning", insightsNavigation)}
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-700 to-indigo-900 border border-brand-500/50 flex items-center justify-center text-brand-200 text-xs font-bold shrink-0 shadow-sm">
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
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Session
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
