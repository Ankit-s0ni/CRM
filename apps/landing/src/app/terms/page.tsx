import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Scale, CheckCircle2, AlertTriangle, Building, CreditCard, Ban, HelpCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: "Terms of Service | Liqaa",
  description: "Enterprise Terms of Service governing access and usage of the Liqaa Multi-Product Business Operating System.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "August 18, 2026";

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#191D1A]">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 pt-36 pb-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#018074] transition hover:opacity-80 mb-8"
        >
          <ArrowLeft size={16} /> Back to Overview
        </Link>

        <header className="border-b border-[#E5E7EB] pb-10 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#018074]/10 text-[#018074] text-xs font-bold uppercase tracking-wider mb-4">
            <Scale size={14} /> Master Agreement
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4">
            Terms of Service
          </h1>
          <p className="text-base text-[#64748B]">
            Effective Date: {lastUpdated} | Version 3.1 (Multi-Product Enterprise Edition)
          </p>
        </header>

        <article className="prose prose-slate max-w-none space-y-12 text-[#334155] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <ShieldCheck className="text-[#018074]" size={24} />
              1. Acceptance of Terms & Structure
            </h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo; or &ldquo;Agreement&rdquo;) constitute a legally binding contract between <strong>Liqaa</strong> (&ldquo;Liqaa,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;) and the business entity or organization subscribing to our services (&ldquo;Tenant,&rdquo; &ldquo;Customer,&rdquo; &ldquo;you,&rdquo; or &ldquo;Employer&rdquo;), along with authorized users accessing workspace accounts.
            </p>
            <p>
              By creating a workspace at <code>platform.liqaahq.com/signup</code>, deploying connected product modules (such as Liqaa HRMS or Liqaa POS), or downloading our mobile applications, you confirm that you have legal authority to bind your organization to these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Building className="text-[#018074]" size={24} />
              2. Workspace Provisioning, Accounts & Multi-Tenant Isolation
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Workspace Allocation:</strong> Upon registration, you are allocated a unique dedicated workspace subdomain (e.g., <code>tenant.liqaahq.com</code>). You are responsible for safeguarding admin credentials.</li>
              <li><strong>Authorized User Seats:</strong> Access is provisioned on a per-user basis. Accounts cannot be shared between multiple individuals. Tenants are responsible for managing employee provisioning, role assignment, and access revocation upon employee offboarding.</li>
              <li><strong>Multi-Product Entitlements:</strong> Subscribed modules (HRMS, POS, Commerce, Mail) communicate via cryptographically signed tokens. Unauthorized attempts to bypass product entitlement gates will result in immediate suspension.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <CheckCircle2 className="text-[#018074]" size={24} />
              3. Employer Compliance & Employee Consent Obligations
            </h2>
            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-sm">
              <p>
                <strong>Employer Responsibility:</strong> When deploying Liqaa HRMS mobile attendance, GPS geofencing, on-duty field tracking, and facial recognition, the Employer represents and warrants that:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The Employer has obtained all legally mandated prior written notices and valid consents from employees in compliance with local labor and data privacy laws.</li>
                <li>The Employer will configure geofences and shift boundaries solely for legitimate business purposes (payroll accuracy, workplace safety, and client visit verification).</li>
                <li>The Employer acknowledges that Liqaa automatically terminates background location recording the moment an employee punches out of an active shift.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <AlertTriangle className="text-[#018074]" size={24} />
              4. Prohibited Uses & Anti-Spoofing Rules
            </h2>
            <p>You and your authorized users agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Use mock GPS applications, location spoofing software, or modified operating system kernels to falsify attendance or travel records.</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Liqaa Platform or Mobile SDKs.</li>
              <li>Circumvent multi-factor authentication (MFA) or device binding security policies.</li>
              <li>Introduce malicious scripts, viruses, or automated scraping bots against Liqaa APIs.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <CreditCard className="text-[#018074]" size={24} />
              5. Subscription Plans, Billing & Payment Terms
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Pricing Structure:</strong> Subscriptions are billed on a recurring monthly or annual basis, calculated by active user tiers, selected modules, and geographical operating zone.</li>
              <li><strong>Taxes & Invoicing:</strong> Invoices include applicable regional taxes (GST/VAT). Payments are due upon invoice generation or processed via pre-authorized provider-hosted payment methods.</li>
              <li><strong>Dunning & Suspension:</strong> If automated payment fails, Liqaa provides a 14-day grace period. Accounts remaining past-due beyond the grace period may have product access downgraded to read-only mode.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Scale className="text-[#018074]" size={24} />
              6. Intellectual Property & Customer Data Ownership
            </h2>
            <p className="text-sm">
              <strong>Your Data Remains Yours:</strong> The Tenant retains all right, title, and ownership interest in and to all employee records, attendance logs, files, and payroll calculations uploaded to the workspace.
            </p>
            <p className="text-sm">
              <strong>Liqaa IP:</strong> Liqaa and its licensors retain exclusive ownership of the software architecture, user interfaces, branding, API designs, and underlying code.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Ban className="text-[#018074]" size={24} />
              7. Service Level Agreement (SLA) & Limitation of Liability
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Uptime Target:</strong> Liqaa targets a 99.9% monthly platform availability, excluding scheduled maintenance windows announced in advance.</li>
              <li><strong>Disclaimer:</strong> To the maximum extent permitted by applicable law, the services are provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis.</li>
              <li><strong>Liability Cap:</strong> In no event will Liqaa&rsquo;s total aggregate liability arising out of or related to this Agreement exceed the total subscription fees paid by the Tenant in the twelve (12) months preceding the incident.</li>
            </ul>
          </section>

          <section className="space-y-4 pt-6 border-t border-[#E5E7EB]">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <HelpCircle className="text-[#018074]" size={24} />
              8. Contact & Legal Notices
            </h2>
            <p className="text-sm">
              For formal legal inquiries, contract amendments, or enterprise master service agreements (MSAs), contact:
            </p>
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm">
              <p><strong>Liqaa Legal & Enterprise Operations</strong></p>
              <p>Email: <a href="mailto:legal@liqaahq.com" className="text-[#018074] font-semibold underline">legal@liqaahq.com</a></p>
              <p>Physical Correspondence: Liqaa Enterprise Cloud Infrastructure Division</p>
            </div>
          </section>
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}
