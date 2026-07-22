"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useAuthStore } from "@/lib/auth-store";
import { getApiErrorMessage } from "@/lib/api-error";

function sanitizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingAuth = useAuthStore((state) => state.pendingAuth);
  const setPendingAuth = useAuthStore((state) => state.setPendingAuth);
  const email = searchParams.get("email") ?? pendingAuth.email ?? "";
  const workspace = searchParams.get("workspace") ?? pendingAuth.workspace ?? "";
  const tenantId = searchParams.get("tenantId") ?? pendingAuth.tenantId ?? "";
  const initialCode = sanitizeCode(searchParams.get("token") ?? "");
  const initialDelivery = searchParams.get("delivery");
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendMessage, setResendMessage] = useState(
    initialDelivery === "FAILED"
      ? "Email delivery is temporarily unavailable. Please try resending now."
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    initialDelivery === "FAILED" ? 0 : 42,
  );

  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
  const digits = useMemo(() => {
    const padded = `${code}${" ".repeat(6)}`.slice(0, 6);
    return padded.split("");
  }, [code]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (code.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    if (!tenantId) {
      setError("Tenant context is missing. Please restart the signup flow.");
      return;
    }

    setLoading(true);

    try {
      setPendingAuth({
        tenantId,
        workspace: workspace || null,
        email: email || null,
      });
      await axios.post(
        `${baseURL}/auth/verify`,
        { token: code, type: "EMAIL_VERIFY" },
        { headers: { "x-tenant-id": tenantId } },
      );

      setMessage("Email verified. You can sign in to your workspace now.");
      router.push(
        `/login?tenantId=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspace)}&email=${encodeURIComponent(email)}`,
      );
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "We couldn't verify that code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setResendMessage("");

    if (!tenantId) {
      setError("Tenant context is missing. Please restart the signup flow.");
      return;
    }

    if (secondsLeft > 0) {
      return;
    }

    setResending(true);

    try {
      const response = await axios.post(
        `${baseURL}/auth/verify/resend`,
        { email },
        { headers: { "x-tenant-id": tenantId } },
      );

      const debugToken = sanitizeCode(response.data?.debugVerificationToken ?? "");
      if (debugToken) {
        setCode(debugToken);
      }

      if (response.data?.emailDelivery === "FAILED") {
        setResendMessage("Email delivery is still unavailable. Please try again shortly.");
        setSecondsLeft(0);
      } else {
        setResendMessage("A fresh verification code has been sent.");
        setSecondsLeft(42);
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Unable to resend the code right now."));
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <div className="rounded-[12px] border border-surface-variant bg-white px-6 pb-7 pt-7 text-center shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
        <div className="mb-8 flex items-center justify-center gap-2">
          <img src="/logo-horizontal.png" alt="DeltCRM Logo" className="h-7 w-auto" />
        </div>

        <div className="mb-6 flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10" />
            <span className="material-symbols-outlined relative z-10 text-[48px] font-light text-primary">mail</span>
          </div>
        </div>

        <h1 className="mb-2 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-zinc-900">Verify your email</h1>
        <p className="mb-8 text-[16px] leading-6 text-on-surface-variant">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-zinc-900">{email || "your email"}</span>
        </p>

        {error ? (
          <div className="mb-5 rounded-[12px] border border-error/15 bg-error-container px-4 py-3 text-left text-sm text-on-error-container">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-5 rounded-[12px] border border-emerald-800/15 bg-emerald-300/20 px-4 py-3 text-left text-sm text-emerald-900">
            {message}
          </div>
        ) : null}

        {resendMessage ? (
          <div className="mb-5 rounded-[12px] border border-zinc-300 bg-zinc-50 px-4 py-3 text-left text-sm text-on-surface-variant">
            {resendMessage}
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={handleVerify}>
          <input
            id="verification-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="sr-only"
            value={code}
            onChange={(event) => setCode(sanitizeCode(event.target.value))}
          />
          <div className="mb-6 flex justify-between gap-2">
            {digits.map((digit, index) => (
              <button
                key={`${digit}-${index}`}
                type="button"
                onClick={() => {
                  const target = document.getElementById("verification-code");
                  target?.focus();
                }}
                className="flex h-14 w-12 items-center justify-center rounded-[12px] border-2 border-zinc-300 bg-surface text-[20px] font-bold text-zinc-900 transition-all duration-200 hover:border-primary focus:border-primary"
              >
                {digit.trim() || ""}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-primary px-6 text-[14px] font-medium leading-5 text-white shadow-sm transition-all hover:bg-zinc-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <span aria-hidden="true" className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Verifying...
              </>
            ) : (
              <>
                Verify
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-4 text-center">
          <p className="text-[14px] leading-5 text-on-surface-variant">
            Didn&apos;t receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || secondsLeft > 0}
              className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {resending
                ? "Resending..."
                : secondsLeft > 0
                  ? `Resend code (0:${secondsLeft.toString().padStart(2, "0")})`
                  : "Resend code"}
            </button>
          </p>

          <div className="pt-1">
            <Link
              className="inline-flex items-center justify-center gap-1 text-[14px] font-medium leading-5 text-on-surface-variant transition-colors hover:text-primary"
              href="/signup"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Change email
            </Link>
          </div>
        </div>
      </div>
      <footer className="mt-6 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-outline">
          Secure Enterprise HRMS Infrastructure
        </p>
      </footer>
    </>
  );
}
