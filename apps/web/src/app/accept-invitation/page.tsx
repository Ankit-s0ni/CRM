import { Suspense } from "react";
import { InvitationAcceptanceForm } from "@/components/invitation-acceptance-form";

export default function AcceptInvitationPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-5 py-10">
      <div className="absolute -left-32 top-10 size-96 rounded-full bg-zinc-100/45 blur-3xl" />
      <div className="absolute -bottom-32 right-0 size-[28rem] rounded-full bg-emerald-100/55 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-xl font-black text-white shadow-lg shadow-primary/20">
            D
          </div>
          <img src="/logo-horizontal.png" alt="DeltCRM Logo" className="mt-3 h-7 w-auto" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
            Employee account setup
          </p>
        </div>
        <Suspense>
          <InvitationAcceptanceForm />
        </Suspense>
      </div>
    </main>
  );
}
