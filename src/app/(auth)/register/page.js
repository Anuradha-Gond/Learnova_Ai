"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerClientSchema } from "@/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // True only after session status resolves to "authenticated"
  const [showAuthNotice, setShowAuthNotice] = useState(false);

  // If an existing session is detected AFTER the loading state resolves,
  // show a notice — do NOT silently redirect while the user may be typing.
  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") {
      setShowAuthNotice(true);
    }
  }, [status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    // Client-side validation
    const result = registerClientSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setServerError("");
    setIsLoading(true);

    try {
      // Step 1: Create the account
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          setServerError(data.error || "An account with this email address already exists.");
        } else if (res.status === 422 && data.details) {
          setFieldErrors(data.details);
        } else {
          setServerError(data.error || "Registration failed. Please verify your details.");
        }
        setIsLoading(false);
        return;
      }

      // Step 2: Sign in with the new account's credentials
      const signInRes = await signIn("credentials", {
        redirect: false,
        email: result.data.email,
        password: result.data.password,
      });

      if (signInRes?.ok) {
        // Navigate to dashboard — the new session now belongs to the just-registered user
        router.push("/dashboard");
        router.refresh();
      } else {
        // Registration succeeded but auto-login failed — send to login page with a banner
        router.push("/login?registered=true");
      }
    } catch {
      setServerError("Network error occurred. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Create Student Account
        </h1>
        <p className="text-xs text-slate-400">
          Join Learnova AI to organize materials, master difficult topics, and track progress.
        </p>
      </div>

      {/* Already-authenticated notice — only shown when session resolves to authenticated */}
      {showAuthNotice && (
        <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-100 mb-1">You are already signed in.</p>
            <p>Go to your dashboard, or sign out first if you want to create a new account.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-500/50 text-amber-200 hover:bg-amber-900/40"
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </Button>
        </div>
      )}

      {/* Server error — only rendered when there is a non-empty message */}
      {serverError && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <Input
          label="Full Name"
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          icon={User}
          placeholder="e.g. Jane Doe"
          value={formData.name}
          onChange={handleChange}
          error={fieldErrors.name?.[0]}
          className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
        />

        {/* Email Address */}
        <Input
          label="Email Address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          icon={Mail}
          placeholder="student@university.edu"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email?.[0]}
          className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
        />

        {/* Password */}
        <Input
          label="Password (min. 8 characters)"
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          icon={Lock}
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password?.[0]}
          className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-200 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          id="confirmPassword"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          icon={Lock}
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword?.[0]}
          className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-200 focus:outline-none"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 shadow-md shadow-brand-500/20"
        >
          <span>Complete Registration</span>
          {!isLoading && <ArrowRight className="w-4 h-4 ml-1.5" />}
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
        <span>Already have an account? </span>
        <Link
          href="/login"
          className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4"
        >
          Sign In Here
        </Link>
      </div>
    </div>
  );
}
