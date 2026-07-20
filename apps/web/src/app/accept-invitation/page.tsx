import { Suspense } from "react";
import { InvitationAcceptanceForm } from "@/components/invitation-acceptance-form";

export default function AcceptInvitationPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fcf8ff] px-5 py-10">
      <div className="absolute -left-32 top-10 size-96 rounded-full bg-[#dcd7ff]/45 blur-3xl" />
      <div className="absolute -bottom-32 right-0 size-[28rem] rounded-full bg-[#d8f8df]/55 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#3525cd] text-xl font-black text-white shadow-lg shadow-[#3525cd]/20">
            D
          </div>
          <p className="mt-3 text-lg font-bold text-[#1c1b1f]">DeltCRM</p>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#777587]">
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
