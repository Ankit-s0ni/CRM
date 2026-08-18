import { SignupForm } from "@/features/platform/identity/signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-surface text-foreground md:flex">
      <section className="sticky top-0 hidden h-screen w-[48%] flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#004d46] via-[#01655c] to-[#018074] px-10 py-10 md:flex">
        <div className="absolute right-[-96px] top-[-96px] h-72 w-72 rounded-full bg-white opacity-10 blur-3xl" />
        <div className="absolute bottom-[-80px] left-[-80px] h-52 w-52 rounded-full bg-emerald-400 opacity-10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo-square.png" alt="Liqaa Logo" className="h-9 w-9 object-contain" />
          <div className="text-[24px] font-bold tracking-tight text-white">Liqaa</div>
        </div>

        <div className="relative z-10 my-auto flex flex-col gap-6 py-6">
          <div className="space-y-3">
            <h2 className="max-w-[420px] text-[28px] font-bold leading-[1.18] tracking-[-0.02em] text-white">
              The modern operating system for fast-growing businesses.
            </h2>
            <p className="max-w-[440px] text-[15px] leading-[1.5] text-emerald-100/80">
              Streamline people, attendance, payroll and operations with an enterprise-grade platform that sets up in minutes.
            </p>
          </div>

          <div className="overflow-hidden rounded-[16px] border border-white/10 shadow-2xl">
            <img
              className="aspect-[16/9] w-full object-cover"
              alt="Liqaa dashboard preview"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAe5ozwbQlFHeN7yawUSO7GqPsFKbEPPK-7PFlzRMZ1ZfyG3irJ488RlrhVlzrdX_rRHCaOt7QYb5mIrrIX_hPH6CAEGCKXVTi_bgF0TxrXc2jaNKOhJ7hPf3POP_Il113MZuFqq-V2dhJ-QCsYIJz-Mik28sSv3isGXPM_qWlJlb9GDjHWhabnLsDkcYcRycTpYqqLM9XIns8ZpYazNP64g5C_pjj8jWhK2Lo7uwFaCsGwYVe51iSCsrbZ7gckvouwojAd2zt5ug"
            />
          </div>

          <ul className="flex flex-col gap-4">
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
              <li key={benefit.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <span
                    className="material-symbols-outlined text-[15px] text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-5 text-white">{benefit.title}</p>
                  <p className="max-w-[360px] text-[13px] leading-5 text-emerald-100/70">{benefit.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-white/15 pt-4">
          <p className="text-[12px] font-semibold leading-4 tracking-[0.02em] text-emerald-100/70">
            Trusted by 500+ enterprises across the region.
          </p>
        </div>
      </section>

      <main className="flex flex-1 justify-center bg-surface px-6 py-10 md:px-[64px] md:py-[66px]">
        <SignupForm />
      </main>
    </div>
  );
}
