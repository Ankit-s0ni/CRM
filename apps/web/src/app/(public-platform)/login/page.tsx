import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Building2, CheckCircle2, ShieldCheck, UsersRound } from "lucide-react";
import { LoginForm } from "@/features/platform/identity/login-form";
import { isPlatformAdminHostname, resolveWorkspaceFromHostname } from "@/lib/app-domain";
import { publicLinks } from "@/lib/public-links";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [requestHeaders, params] = await Promise.all([headers(), searchParams]);
  const hostname = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";

  if (isPlatformAdminHostname(hostname)) {
    redirect("/platform/login");
  }

  const hostnameWorkspace = resolveWorkspaceFromHostname(hostname);
  const initialWorkspace = hostnameWorkspace ?? firstValue(params.workspace) ?? null;
  const initialNextPath = firstValue(params.next) ?? null;

  if (hostnameWorkspace) {
    try {
      const apiUrl =
        process.env.INTERNAL_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:4011";
      const res = await fetch(
        `${apiUrl}/workspace/status?subdomain=${encodeURIComponent(hostnameWorkspace)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        if (!data.available) {
          const errorCode = data.errorCode || "WORKSPACE_NOT_FOUND";
          redirect(
            `/workspace-unavailable?code=${encodeURIComponent(errorCode)}&workspace=${encodeURIComponent(hostnameWorkspace)}`,
          );
        }
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        String((err as Record<string, unknown>).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-4 py-6 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_80px_-28px_rgba(30,64,175,0.35)] lg:min-h-[680px] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#eef4ff] via-white to-[#f5f3ff] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full border-[36px] border-blue-100/70" />
          <div>
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-on-tone shadow-lg shadow-primary/25">
              <Building2 className="size-6" />
            </div>
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              DeltCRM workspace
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 xl:text-5xl">
              One secure home for every product.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Sign in once to move between HRMS, payroll, and the tools your
              company has enabled for you.
            </p>
          </div>

          <div className="grid gap-3 xl:max-w-lg">
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
                className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm"
                key={title}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">
                  <Icon className="size-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-12 lg:p-14">
          <div className="mb-9">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-on-tone shadow-lg shadow-primary/20">
              <Building2 className="size-7" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Sign in to your workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Access your company workspace securely.
            </p>
          </div>

          <LoginForm
            initialNextPath={initialNextPath}
            initialWorkspace={initialWorkspace}
          />

          <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
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
