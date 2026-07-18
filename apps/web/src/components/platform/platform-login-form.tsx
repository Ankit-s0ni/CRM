"use client";

import { ArrowRight, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import type { PlatformSessionResponse } from "@/lib/platform-types";

type PlatformLoginResponse =
  | { mfaRequired: true; challengeToken: string; expiresIn: number }
  | (PlatformSessionResponse & { mfaRequired: false });

export function PlatformLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const setSession = usePlatformAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!challengeToken) {
        const { data } = await platformApiClient.post<PlatformLoginResponse>("/platform/auth/login", { email, password });
        if (data.mfaRequired) {
          setChallengeToken(data.challengeToken);
        } else {
          setSession(data);
          router.replace(search.get("next") || "/platform/tenants");
        }
      } else {
        const { data } = await platformApiClient.post<PlatformSessionResponse>("/platform/auth/mfa/verify", { challengeToken, code });
        setSession(data);
        router.replace(search.get("next") || "/platform/tenants");
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to sign in to the platform."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[430px] rounded-2xl border border-[#ded9eb] bg-white p-8 shadow-[0_24px_70px_rgba(53,37,205,.12)]">
      <div className="mb-7 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#4f46e5] text-white"><Building2 /></div><div><h1 className="text-xl font-bold">DeltCRM</h1><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#777587]">Platform administration</p></div></div>
      <div className="mb-7"><div className="mb-4 grid size-12 place-items-center rounded-full bg-[#f0edff] text-[#3525cd]">{challengeToken ? <ShieldCheck /> : <KeyRound />}</div><h2 className="text-2xl font-bold">{challengeToken ? "Verify your identity" : "Super admin sign in"}</h2><p className="mt-2 text-sm leading-6 text-[#646273]">{challengeToken ? "Enter the six-digit code from your authenticator app." : "Use your platform owner credentials. Tenant accounts cannot access this area."}</p></div>
      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!challengeToken ? <div className="space-y-5"><label className="block text-sm font-semibold">Work email<Input className="mt-2 h-11 border-[#c8c5d0] px-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label><label className="block text-sm font-semibold">Password<Input className="mt-2 h-11 border-[#c8c5d0] px-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="current-password" /></label></div> : <label className="block text-sm font-semibold">Authentication code<Input className="mt-2 h-12 border-[#c8c5d0] text-center text-xl tracking-[.45em]" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus /></label>}
      <Button type="submit" disabled={busy} className="mt-7 h-12 w-full bg-[#3525cd] text-white hover:bg-[#2b1fb0]">{busy ? "Please wait..." : challengeToken ? "Verify and continue" : "Sign in"}<ArrowRight /></Button>
      {challengeToken && <button type="button" className="mt-4 w-full text-sm font-medium text-[#3525cd]" onClick={() => { setChallengeToken(""); setCode(""); setError(""); }}>Use another account</button>}
    </form>
  );
}
