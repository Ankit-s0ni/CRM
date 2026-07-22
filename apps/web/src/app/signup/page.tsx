import { SignupForm } from "@/features/platform/identity/signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-surface text-zinc-900 md:flex">
      <section className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(79,62,219,0.2),_transparent_28%),linear-gradient(180deg,#353535_0%,#333333_100%)] px-[50px] pb-[36px] pt-[50px] md:flex md:w-[50.4%] md:flex-col md:justify-between">
        <div className="absolute right-[-96px] top-[-96px] h-72 w-72 rounded-full bg-zinc-400 opacity-20 blur-3xl" />
        <div className="absolute bottom-[-80px] left-[-80px] h-52 w-52 rounded-full bg-emerald-400 opacity-[0.08] blur-3xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="text-[28px] font-bold tracking-tight text-white">DeltCRM</div>
        </div>

        <div className="relative z-10 flex flex-col gap-10">
          <div className="space-y-5">
            <h2 className="max-w-[392px] text-[33px] font-bold leading-[1.12] tracking-[-0.03em] text-zinc-50">
              The most reliable CRM for fast-growing teams.
            </h2>
            <p className="max-w-[450px] text-[18px] leading-[1.55] text-zinc-200">
              Streamline your workflow with an enterprise-grade platform that sets up in minutes.
            </p>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-white/10 shadow-2xl">
            <img
              className="aspect-[16/10] w-full object-cover"
              alt="DeltCRM dashboard preview"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAe5ozwbQlFHeN7yawUSO7GqPsFKbEPPK-7PFlzRMZ1ZfyG3irJ488RlrhVlzrdX_rRHCaOt7QYb5mIrrIX_hPH6CAEGCKXVTi_bgF0TxrXc2jaNKOhJ7hPf3POP_Il113MZuFqq-V2dhJ-QCsYIJz-Mik28sSv3isGXPM_qWlJlb9GDjHWhabnLsDkcYcRycTpYqqLM9XIns8ZpYazNP64g5C_pjj8jWhK2Lo7uwFaCsGwYVe51iSCsrbZ7gckvouwojAd2zt5ug"
            />
          </div>

          <ul className="flex flex-col gap-6">
            {[
              {
                title: "Hardware-free attendance",
                body: "Employees check-in from their mobile devices with zero hardware investment.",
              },
              {
                title: "GPS + Face Verification",
                body: "Ensure authenticity with dual-layer verification for every attendance entry.",
              },
              {
                title: "Instant setup",
                body: "Get your organization live in under 10 minutes with our smart onboarding wizard.",
              },
            ].map((benefit) => (
              <li key={benefit.title} className="flex items-start gap-4">
                <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-300">
                  <span
                    className="material-symbols-outlined text-[18px] text-emerald-900"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold leading-5 text-zinc-50">{benefit.title}</p>
                  <p className="max-w-[370px] text-[14px] leading-6 text-zinc-300">{benefit.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-7">
          <p className="text-[12px] font-semibold leading-4 tracking-[0.02em] text-zinc-300">
            Trusted by 500+ enterprises across India.
          </p>
        </div>
      </section>

      <main className="flex flex-1 justify-center bg-surface px-6 py-10 md:px-[64px] md:py-[66px]">
        <SignupForm />
      </main>
    </div>
  );
}
