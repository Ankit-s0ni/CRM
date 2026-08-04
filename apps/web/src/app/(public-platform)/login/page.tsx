import { Suspense } from "react";
import { Building2, CheckCircle2, ShieldCheck, UsersRound } from "lucide-react";
import { LoginForm } from "@/features/platform/identity/login-form";
import { publicLinks } from "@/lib/public-links";
import { APP_DOMAIN } from "@/lib/app-domain";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[1fr_440px]">
        <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex size-12 items-center justify-center rounded-lg bg-[#151515] text-white shadow-lg shadow-[#151515]/20">
              <Building2 className="size-6" />
            </div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
              DELTCRM Workspace
            </p>
            <h1 className="mt-3 max-w-lg text-4xl font-semibold leading-tight tracking-tight">
              Sign in to your operations workspace
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
              Review attendance, employees, payroll, permissions, and daily HR
              queues from one focused console.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              {
                icon: UsersRound,
                title: "Employee operations",
                body: "Directory, attendance, leave, and approvals.",
              },
              {
                icon: ShieldCheck,
                title: "Secure access",
                body: "Tenant-aware login with role-based navigation.",
              },
              {
                icon: CheckCircle2,
                title: "Live queues",
                body: "Actions and exceptions stay easy to scan.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
                key={title}
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-[#beb8ad]" />
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-white/60">
                    {body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-lg bg-[#151515] text-white shadow-lg shadow-[#151515]/20">
              <Building2 className="size-7" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              DELTCRM
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              app.{APP_DOMAIN}
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <footer className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <a className="hover:text-foreground" href={publicLinks.privacy}>
              Privacy Policy
            </a>
            <a className="hover:text-foreground" href={publicLinks.terms}>
              Terms of Service
            </a>
            <a className="hover:text-foreground" href={publicLinks.help}>
              Help Center
            </a>
          </footer>
        </section>
      </div>
    </main>
  );
}
