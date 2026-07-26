import { Suspense } from "react";
import { PlatformLoginForm } from "@/features/platform/platform-login-form";

export default function PlatformLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-6">
      <Suspense>
        <PlatformLoginForm />
      </Suspense>
    </main>
  );
}
