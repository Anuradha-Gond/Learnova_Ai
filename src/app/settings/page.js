"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  User as UserIcon,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Shield,
  GraduationCap,
  Calendar,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "student",
    academicLevel: "",
    targetExam: "",
    createdAt: null,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load user profile.");
      }
      const data = await res.json();
      if (data.user) {
        setProfile(data.user);
      }
    } catch (err) {
      setProfileError(err.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          academicLevel: profile.academicLevel,
          targetExam: profile.targetExam,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setProfileSuccess("Profile settings updated successfully.");
      if (data.user) {
        setProfile(data.user);
      }
    } catch (err) {
      setProfileError(err.message || "An error occurred while updating profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess("");
    setPasswordError("");

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match.");
      setPasswordSaving(false);
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setPasswordSuccess("Password updated successfully.");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(err.message || "An error occurred while changing password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-16 bg-slate-900/60 rounded-2xl animate-pulse" />
        <SkeletonCard className="bg-slate-900/60 border-slate-800" />
        <SkeletonCard className="bg-slate-900/60 border-slate-800" />
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Account Settings & Preferences
          </h1>
          <Badge variant="teal" size="sm">
            Milestone 8
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your student profile, academic focus, target examinations, and security credentials.
        </p>
      </div>

      {/* ── Section 1: Student Profile Settings ─────────────────────── */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white">Student Profile</h2>
          </div>
          <Badge variant="primary" size="sm">
            Verified Student
          </Badge>
        </div>

        {profileSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <ErrorState message={profileError} onClose={() => setProfileError("")} />
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email Address (Read-only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email Address (Primary Identity)
              </label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full text-xs bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-3.5 py-2.5 cursor-not-allowed"
                title="Email cannot be changed"
              />
              <span className="text-[10px] text-slate-500">
                Used for authentication and private document isolation.
              </span>
            </div>

            {/* Academic Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Academic Level
              </label>
              <input
                type="text"
                maxLength={100}
                value={profile.academicLevel}
                onChange={(e) =>
                  setProfile({ ...profile, academicLevel: e.target.value })
                }
                className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500"
                placeholder="e.g. Undergraduate, High School, Medical"
              />
            </div>

            {/* Target Exam */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Target Exam / Goal
              </label>
              <input
                type="text"
                maxLength={100}
                value={profile.targetExam}
                onChange={(e) =>
                  setProfile({ ...profile, targetExam: e.target.value })
                }
                className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500"
                placeholder="e.g. SAT, USMLE, Semester Finals, GRE"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              Member since: <strong className="text-slate-300">{formatDate(profile.createdAt)}</strong>
            </span>

            <Button
              type="submit"
              size="sm"
              disabled={profileSaving}
              className="bg-brand-600 hover:bg-brand-500 text-white gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{profileSaving ? "Saving Changes..." : "Save Profile"}</span>
            </Button>
          </div>
        </form>
      </section>

      {/* ── Section 2: Security & Password ──────────────────────────── */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">Security & Password</h2>
          </div>
          <Badge variant="teal" size="sm">
            Bcrypt Encrypted
          </Badge>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <ErrorState message={passwordError} onClose={() => setPasswordError("")} />
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Current Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={passwords.currentPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, currentPassword: e.target.value })
              }
              className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500"
              placeholder="Enter current password"
            />
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              New Password (minimum 8 characters) <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={passwords.newPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, newPassword: e.target.value })
              }
              className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500"
              placeholder="Enter new password"
            />
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Confirm New Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={passwords.confirmPassword}
              onChange={(e) =>
                setPasswords({ ...passwords, confirmPassword: e.target.value })
              }
              className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500"
              placeholder="Re-enter new password"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={passwordSaving}
              className="bg-teal-600 hover:bg-teal-500 text-white gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{passwordSaving ? "Updating Password..." : "Change Password"}</span>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
