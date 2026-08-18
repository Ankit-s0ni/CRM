import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Scale, Building, AlertTriangle, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Liqaa Platform",
  description: "Master Terms of Service for Liqaa Multi-Product Business Operating System.",
};

export default function PlatformTermsPage() {
  const lastUpdated = "August 18, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-square.png" alt="Liqaa Logo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold tracking-tight text-foreground">Liqaa Platform</span>
          </div>
          <Link
            href="/signup"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Return to Signup
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="border-b border-border pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            <Scale size={14} /> Master Agreement
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: {lastUpdated} | Version 3.1 (Multi-Product Enterprise Edition)
          </p>
        </header>

        <article className="space-y-10 text-foreground leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="text-primary" size={20} />
              1. Master Agreement & Tenant Provisioning
            </h2>
            <p className="text-muted-foreground">
              By registering a workspace on <code>platform.liqaahq.com</code>, you represent that you possess legal authority to bind your organization to these Terms. You receive dedicated multi-tenant isolation, seat licensing, and module entitlements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Building className="text-primary" size={20} />
              2. Employer Obligations & Employee Notices
            </h2>
            <p className="text-muted-foreground">
              When utilizing Liqaa HRMS mobile attendance, geofences, on-duty tracking, and facial recognition, the Employer guarantees that proper employee notices and consents have been obtained in full compliance with local labor and data protection laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <AlertTriangle className="text-primary" size={20} />
              3. Prohibited Usage & Anti-Spoofing
            </h2>
            <p className="text-muted-foreground">
              Users and employers agree never to use mock GPS applications, fake location generators, or modified hardware to forge attendance records, or attempt to bypass security policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Scale className="text-primary" size={20} />
              4. Data Ownership & Inquiries
            </h2>
            <p className="text-muted-foreground">
              The Tenant owns all uploaded employee and operational data. Liqaa provides a 99.9% uptime SLA target.
            </p>
            <p className="text-muted-foreground">
              For contract inquiries, email: <strong>legal@liqaahq.com</strong>.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
