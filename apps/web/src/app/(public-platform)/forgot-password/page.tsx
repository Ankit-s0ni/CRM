import { Suspense } from "react";
import { PasswordResetForm } from "@/features/platform/identity/password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-emerald-800/5 blur-[120px]" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <Suspense>
          <PasswordResetForm />
        </Suspense>
      </main>
    </div>
  );
}
