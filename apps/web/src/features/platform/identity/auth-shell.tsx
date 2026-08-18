import { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-5 py-8">
      <main className="w-full max-w-[1120px]">
        <div className="grid overflow-hidden rounded-lg border border-border bg-card shadow-xl shadow-border/70 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden border-e border-border bg-foreground p-10 text-on-tone lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-card/10 ring-1 ring-on-tone/15">
                <span className="material-symbols-outlined text-[28px]">domain</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-tone/60">
                  Liqaa Workspace
                </p>
                <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
                  {title}
                </h1>
                <p className="max-w-lg text-sm leading-6 text-on-tone/72">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-card/10 p-5 ring-1 ring-on-tone/10">
                <p className="text-xl font-semibold">10 min</p>
                <p className="mt-1 text-sm text-on-tone/72">Average setup time</p>
              </div>
              <div className="rounded-lg bg-card/10 p-5 ring-1 ring-on-tone/10">
                <p className="text-xl font-semibold">GPS + Face</p>
                <p className="mt-1 text-sm text-on-tone/72">Zero hardware attendance</p>
              </div>
              <div className="rounded-lg bg-card/10 p-5 ring-1 ring-on-tone/10">
                <p className="text-xl font-semibold">Live Ops</p>
                <p className="mt-1 text-sm text-on-tone/72">Register, alerts, and reports</p>
              </div>
            </div>
          </section>

          <section className="bg-card p-6 sm:p-10">
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
