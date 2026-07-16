import { Suspense } from "react";
import { PlatformLoginForm } from "@/components/platform/platform-login-form";

export default function PlatformLoginPage() {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fcf8ff] p-6"><div className="absolute -left-32 -top-36 size-[420px] rounded-full bg-[#e2dfff] blur-3xl" /><div className="absolute -bottom-48 -right-32 size-[520px] rounded-full bg-[#dff8e5] blur-3xl" /><Suspense><PlatformLoginForm /></Suspense></main>;
}

