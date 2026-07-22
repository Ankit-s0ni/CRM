import { Suspense } from "react";
import { PlatformLoginForm } from "@/features/platform/platform-login-form";

export default function PlatformLoginPage() {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-surface p-6"><div className="absolute -left-32 -top-36 size-[420px] rounded-full bg-zinc-100 blur-3xl" /><div className="absolute -bottom-48 -right-32 size-[520px] rounded-full bg-emerald-50 blur-3xl" /><Suspense><PlatformLoginForm /></Suspense></main>;
}

