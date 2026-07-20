"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useAuthStore } from "@/lib/auth-store";
import { getApiErrorMessage } from "@/lib/api-error";

function getStrength(password: string) {
  const checks = [
    password.length >= 8,
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  return {
    checks,
    passed: checks.filter(Boolean).length,
  };
}

export function PasswordResetForm() {
  const searchParams = useSearchParams();
  const pendingAuth = useAuthStore((state) => state.pendingAuth);
  const setPendingAuth = useAuthStore((state) => state.setPendingAuth);
  const token = searchParams.get("token");
  const isResetState = Boolean(token);
  const tenantId = searchParams.get("tenantId") ?? pendingAuth.tenantId ?? "";
  const workspace = searchParams.get("workspace") ?? pendingAuth.workspace ?? "";
  const emailParam = searchParams.get("email") ?? pendingAuth.email ?? "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
  const backToLoginHref = `/login?tenantId=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspace)}&email=${encodeURIComponent(email)}`;

  function getStrengthTone() {
    if (strength.passed <= 1) {
      return {
        width: `${Math.max(10, strength.passed * 33)}%`,
        bar: "bg-error",
        text: "Security level: Weak",
        textColor: "text-error",
      };
    }

    if (strength.passed === 2) {
      return {
        width: "66%",
        bar: "bg-amber-900",
        text: "Security level: Moderate",
        textColor: "text-amber-900",
      };
    }

    return {
      width: "100%",
      bar: "bg-emerald-800",
      text: "Security level: Strong",
      textColor: "text-emerald-800",
    };
  }

  const strengthTone = getStrengthTone();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!tenantId) {
        throw new Error("Tenant context is missing. Restart from your workspace login page.");
      }

      setPendingAuth({
        tenantId,
        workspace: workspace || null,
        email: email || null,
      });

      if (isResetState) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        await axios.post(
          `${baseURL}/auth/password-reset/confirm`,
          {
            token,
            password,
          },
          { headers: { "x-tenant-id": tenantId } },
        );
        setMessage("Password reset complete. You can sign in now.");
        setToastVisible(true);
      } else {
        const response = await axios.post(
          `${baseURL}/auth/password-reset`,
          { email },
          { headers: { "x-tenant-id": tenantId } },
        );

        const debugResetToken = response.data?.debugResetToken;
        if (debugResetToken) {
          window.location.assign(
            `/forgot-password?tenantId=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspace)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(debugResetToken)}`,
          );
          return;
        }

        setMessage("If the account exists, a reset link has been queued.");
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className={`w-full max-w-[380px] rounded-[12px] border border-zinc-300 bg-zinc-50 p-8 shadow-lg transition-all duration-500 ${isResetState ? "opacity-100 translate-y-0" : "opacity-100"
          }`}
      >
        <div className="mb-8 flex flex-col items-center">
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-[12px] shadow-sm ${isResetState ? "bg-emerald-300" : "bg-primary-container"
              }`}
          >
            <span
              className={`material-symbols-outlined text-[32px] ${isResetState ? "text-emerald-900" : "text-zinc-100"
                }`}
            >
              {isResetState ? "shield_lock" : "lock_reset"}
            </span>
          </div>
          <h1 className="mb-2 text-center text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-zinc-900">
            {isResetState ? "Set New Password" : "Forgot Password?"}
          </h1>
          <p className="max-w-[320px] text-center text-[16px] leading-6 text-on-surface-variant">
            {isResetState
              ? "Your identity is verified. Create a secure password for your DeltCRM Mumbai Hub account."
              : "Enter your official DeltCRM email and we'll send you a secure link to reset your account."}
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-[12px] border border-error/15 bg-error-container px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        ) : null}

        {message && !toastVisible ? (
          <div className="mb-5 rounded-[12px] border border-emerald-800/15 bg-emerald-300/20 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {isResetState ? (
            <>
              <div className="flex flex-col gap-2">
                <label className="ml-1 text-[14px] font-medium leading-5 text-on-surface-variant" htmlFor="password">
                  New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    key
                  </span>
                  <input
                    id="password"
                    type="password"
                    className="h-14 w-full rounded-[8px] border border-zinc-300 bg-white pl-12 pr-4 text-zinc-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
                  <div className={`h-full ${strengthTone.bar} transition-all duration-300`} style={{ width: strengthTone.width }} />
                </div>
                <span className={`text-[12px] font-medium ${strengthTone.textColor}`}>{strengthTone.text}</span>
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-[8px] border border-zinc-300/30 bg-white/50 px-4 py-4">
                <div className={`flex items-center gap-2 text-[13px] transition-colors ${strength.checks[0] ? "text-emerald-800" : "text-on-surface-variant"}`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {strength.checks[0] ? "check_circle" : "circle"}
                  </span>
                  8+ characters
                </div>
                <div className={`flex items-center gap-2 text-[13px] transition-colors ${strength.checks[1] ? "text-emerald-800" : "text-on-surface-variant"}`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {strength.checks[1] ? "check_circle" : "circle"}
                  </span>
                  At least one number
                </div>
                <div className={`flex items-center gap-2 text-[13px] transition-colors ${strength.checks[2] ? "text-emerald-800" : "text-on-surface-variant"}`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {strength.checks[2] ? "check_circle" : "circle"}
                  </span>
                  Special symbol (@#$%!)
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="ml-1 text-[14px] font-medium leading-5 text-on-surface-variant" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                    verified_user
                  </span>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="h-14 w-full rounded-[8px] border border-zinc-300 bg-white pl-12 pr-4 text-zinc-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="ml-1 text-[14px] font-medium leading-5 text-on-surface-variant" htmlFor="email">
                Work Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  className="h-11 w-full rounded-[8px] border border-zinc-300 bg-white pl-10 pr-4 text-zinc-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="name@DeltCRM.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-[8px] bg-primary px-6 text-[14px] font-medium leading-5 text-white shadow-md transition-all hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? isResetState
                ? "Resetting password..."
                : "Sending reset link..."
              : isResetState
                ? "Reset Password"
                : "Send Reset Link"}
          </button>

          {!isResetState ? (
            <div className="text-center">
              <Link
                className="inline-flex items-center justify-center gap-1 text-[14px] font-medium leading-5 text-primary hover:underline"
                href={backToLoginHref}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Login
              </Link>
            </div>
          ) : null}
        </form>
      </div>

      <div className="pointer-events-none fixed bottom-6 right-6 hidden select-none text-right opacity-20 lg:block">
        <img src="/logo-horizontal.png" alt="DeltCRM Logo" className="h-9 w-auto" />
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-outline">Mumbai Hub Systems</p>
      </div>

      <div
        className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-[16px] bg-zinc-900 px-6 py-4 text-surface shadow-2xl transition-transform duration-500 ${toastVisible ? "translate-y-0" : "translate-y-[200%]"
          }`}
      >
        <span
          className="material-symbols-outlined text-emerald-300"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium leading-5">Password Reset Successful</span>
          <span className="text-[12px] leading-4 text-zinc-300">You can now login with your new credentials.</span>
        </div>
        <button className="ml-4 text-zinc-300 hover:text-surface" type="button" onClick={() => setToastVisible(false)}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </>
  );
}
