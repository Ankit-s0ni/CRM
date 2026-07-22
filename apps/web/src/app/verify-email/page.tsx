import { Suspense } from "react";
import { VerifyEmailForm } from "@/features/platform/identity/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-10">
      <main className="relative z-10 w-full max-w-[420px]">
        <Suspense>
          <VerifyEmailForm />
        </Suspense>
      </main>
    </div>
  );
}
