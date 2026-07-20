"use client";

import axios from "axios";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";

export function InvitationAcceptanceForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const workspace = searchParams.get("workspace") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
  const loginQuery = new URLSearchParams({
    ...(workspace ? { workspace } : {}),
    ...(email ? { email } : {}),
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) return setError("This invitation link is incomplete.");
    if (password.length < 8)
      return setError("Password must contain at least 8 characters.");
    if (password !== confirmation)
      return setError("The password confirmation does not match.");

    setBusy(true);
    try {
      await axios.post(`${baseURL}/auth/invitations/accept`, {
        token,
        password,
      });
      setComplete(true);
    } catch (caught) {
      setError(
        getApiErrorMessage(
          caught,
          "This invitation is invalid, expired, or has already been used.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <section className="rounded-2xl border border-zinc-300 bg-white p-8 text-center shadow-xl shadow-primary/5">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-900">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-on-surface">
          Your account is ready
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Sign in to DeltCRM using {email || "your invited email"} and the
          password you just created.
        </p>
        <Link
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary font-bold text-white"
          href={`/login${loginQuery.size ? `?${loginQuery}` : ""}`}
        >
          Continue to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-8 shadow-xl shadow-primary/5">
      <div className="grid size-14 place-items-center rounded-2xl bg-zinc-50 text-primary">
        <KeyRound className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-on-surface">
        Create your employee login
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Set the password you will use for the DeltCRM employee app and web
        self-service.
      </p>
      {email && (
        <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm">
          <span className="block text-xs text-outline">Login email</span>
          <strong>{email}</strong>
        </div>
      )}
      {error && (
        <div className="mt-5 rounded-xl border border-red-300 bg-error-container p-4 text-sm text-on-error-container">
          {error}
        </div>
      )}
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-medium">
          Password
          <span className="relative">
            <input
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border border-outline-variant px-4 pr-12 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-500"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </span>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Confirm password
          <input
            autoComplete="new-password"
            className="h-12 rounded-xl border border-outline-variant px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            minLength={8}
            onChange={(event) => setConfirmation(event.target.value)}
            type={showPassword ? "text" : "password"}
            value={confirmation}
          />
        </label>
        <button
          className="mt-2 h-12 rounded-xl bg-primary font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy || !token || password.length < 8 || !confirmation}
          type="submit"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs leading-5 text-outline">
        This invitation expires after 24 hours and can only be accepted once.
      </p>
    </section>
  );
}
