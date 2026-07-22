import { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-surface px-6 py-8">
      <div className="absolute inset-0 -z-10 bg-surface">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-secondary-container/12 blur-[120px]" />
      </div>

      <main className="w-full max-w-[1120px]">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <section className="hidden rounded-[28px] border border-outline-variant/30 bg-[linear-gradient(135deg,rgba(79,70,229,0.96),rgba(53,37,205,0.92))] p-12 text-white shadow-2xl shadow-primary/20 lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/15">
                <span className="material-symbols-outlined text-[28px]">domain</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/70">
                  DELTCRM Workspace
                </p>
                <h1 className="max-w-md text-4xl font-semibold leading-tight">
                  {title}
                </h1>
                <p className="max-w-lg text-base leading-7 text-white/78">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm ring-1 ring-white/10">
                <p className="text-2xl font-semibold">10 min</p>
                <p className="mt-1 text-sm text-white/72">Average setup time</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm ring-1 ring-white/10">
                <p className="text-2xl font-semibold">GPS + Face</p>
                <p className="mt-1 text-sm text-white/72">Zero hardware attendance</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm ring-1 ring-white/10">
                <p className="text-2xl font-semibold">Live Ops</p>
                <p className="mt-1 text-sm text-white/72">Register, alerts, and reports</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-outline-variant/30 bg-white/95 p-8 shadow-xl shadow-primary/5 backdrop-blur-md sm:p-12">
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
