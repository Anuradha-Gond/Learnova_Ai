"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loginSchema } from "@/validations/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Parse safe callbackUrl (prevent open redirect attacks)
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  const safeCallbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/dashboard";

  const isJustRegistered = searchParams.get("registered") === "true";

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(safeCallbackUrl);
    }
  }, [status, router, safeCallbackUrl]);

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

    // Validate client-side
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setServerError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: result.data.email,
        password: result.data.password,
      });

      if (!res) {
        setServerError("Authentication service unavailable. Please try again.");
        setIsLoading(false);
        return;
      }

      if (res.error) {
        const errorMsg =
          res.error === "CredentialsSignin"
            ? "Invalid email or password"
            : res.error || "Invalid email or password";
        setServerError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Success — route to dashboard
      router.push(safeCallbackUrl);
      router.refresh();
    } catch (err) {
      setServerError("An unexpected error occurred during sign-in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Welcome Back
        </h1>
        <p className="text-xs text-slate-400">
          Sign in to access your study materials, quizzes, and learning analytics.
        </p>
      </div>

      {/* Success banner if redirected from registration */}
      {isJustRegistered && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Account created successfully! Please sign in with your credentials.</span>
        </div>
      )}

      {/* Server error alert */}
      {serverError && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email Field */}
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

        {/* Password Field with visibility toggle */}
        <Input
          label="Password"
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
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

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 shadow-md shadow-brand-500/20"
        >
          <span>Sign In to Learnova</span>
          {!isLoading && <ArrowRight className="w-4 h-4 ml-1.5" />}
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
        <span>Don&apos;t have an account yet? </span>
        <Link
          href="/register"
          className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4"
        >
          Create Student Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-slate-800 rounded-lg w-1/2 mx-auto" />
          <div className="h-4 bg-slate-800/60 rounded w-3/4 mx-auto" />
          <div className="h-10 bg-slate-800 rounded-lg" />
          <div className="h-10 bg-slate-800 rounded-lg" />
          <div className="h-10 bg-brand-900/60 rounded-lg" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
