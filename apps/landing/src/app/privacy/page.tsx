import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, MapPin, Camera, Smartphone, Database, RefreshCw, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Liqaa",
  description: "Detailed Privacy Policy for the Liqaa Multi-Product Business Operating Suite and Liqaa HRMS mobile applications.",
};

export default function PrivacyPolicyPage() {
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
            <Shield size={14} /> Legal & Compliance
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4">
            Privacy Policy
          </h1>
          <p className="text-base text-[#64748B]">
            Effective Date: {lastUpdated} | Version 2.4 (Enterprise & Mobile Suite)
          </p>
        </header>

        <article className="prose prose-slate max-w-none space-y-12 text-[#334155] leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <FileText className="text-[#018074]" size={24} />
              1. Introduction & Overview
            </h2>
            <p>
              Welcome to <strong>Liqaa</strong> (&ldquo;Liqaa,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a cloud-native business operating system providing enterprise software including Liqaa Platform Control Tower, Liqaa HRMS, Liqaa POS, and related mobile applications (the &ldquo;Services&rdquo;).
            </p>
            <p>
              This Privacy Policy explains in transparent detail how we collect, process, store, protect, and share data when your organization (&ldquo;Tenant&rdquo; or &ldquo;Employer&rdquo;) and its employees (&ldquo;Users,&rdquo; &ldquo;Employees,&rdquo; or &ldquo;you&rdquo;) interact with our web platforms, APIs, and mobile applications (iOS and Android).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Eye className="text-[#018074]" size={24} />
              2. Data Controller vs. Data Processor Roles
            </h2>
            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-sm">
              <p>
                <strong>Employer / Tenant as Data Controller:</strong> In the context of employment records, attendance schedules, leave records, salary details, and on-duty tracking, your Employer (the Tenant who provisions your account) acts as the <em>Data Controller</em>. The Employer decides what policies, geofences, and tracking features are enabled.
              </p>
              <p>
                <strong>Liqaa as Data Processor:</strong> Liqaa acts strictly as a <em>Data Processor / Service Provider</em> processing employee information under the written instruction of the Tenant, in compliance with GDPR (Art. 28), CCPA/CPRA, and the Digital Personal Data Protection (DPDP) regulations.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <MapPin className="text-[#018074]" size={24} />
              3. Geolocation & Location Tracking (Foreground & Background)
            </h2>
            <p>
              Liqaa HRMS provides precise workplace verification and on-duty mobility tracking. We require specific device location permissions which operate under strict operational boundaries:
            </p>
            
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-[#E2E8F0] bg-white shadow-sm space-y-2">
                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#018074]" />
                  A. Office Geofence Verification (Foreground Location)
                </h3>
                <p className="text-sm">
                  <strong>Permission:</strong> <code>ACCESS_FINE_LOCATION</code> (Android) / <code>NSLocationWhenInUseUsageDescription</code> (iOS).
                </p>
                <p className="text-sm">
                  <strong>Purpose:</strong> When an employee taps &ldquo;Check In&rdquo; or &ldquo;Check Out,&rdquo; the app accesses the device&rsquo;s GPS coordinates solely to verify whether the employee is physically present within the Employer&rsquo;s authorized office geofence radius.
                </p>
                <p className="text-sm">
                  <strong>Frequency:</strong> Ephemeral check performed only at the precise instant the punch button is pressed. Continuous tracking is NOT active during standard office shifts.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[#E2E8F0] bg-white shadow-sm space-y-2">
                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0284C7]" />
                  B. Active Field Shift Tracking (Background Location)
                </h3>
                <p className="text-sm">
                  <strong>Permission:</strong> <code>ACCESS_BACKGROUND_LOCATION</code>, <code>FOREGROUND_SERVICE_LOCATION</code> (Android) / <code>NSLocationAlwaysAndWhenInUseUsageDescription</code> (iOS).
                </p>
                <p className="text-sm">
                  <strong>Operational Rule:</strong> Background location tracking is <strong>STRICTLY LIMITED to active on-duty field shifts</strong>.
                </p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li>Tracking begins only when an employee explicitly marks attendance for an authorized field/mobile shift.</li>
                  <li>During the shift, periodic GPS breadcrumbs (coordinates, timestamp, battery state) are captured to generate verifiable travel routes and client visit logs.</li>
                  <li><strong>Hard Termination on Punch-Out:</strong> The moment the employee taps &ldquo;Check Out&rdquo; or the scheduled shift expires, all background location listeners are immediately terminated. Liqaa never captures location data during off-duty hours, breaks, or personal time.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Camera className="text-[#018074]" size={24} />
              4. Camera & Facial Biometric Verification
            </h2>
            <p>
              To eliminate buddy-punching and identity fraud, Liqaa HRMS mobile applications utilize camera hardware for facial verification:
            </p>
            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-sm">
              <p>
                <strong>Permission:</strong> <code>CAMERA</code> (Android) / <code>NSCameraUsageDescription</code> (iOS).
              </p>
              <p>
                <strong>Facial Liveness & Match:</strong> When enabled by the Tenant, the employee presents their face during check-in. The app performs client-side liveness detection (blink/head motion) to verify a live human presence and compares facial feature vectors against the employee&rsquo;s enrolled biometric template.
              </p>
              <p>
                <strong>Automated Raw Image Purging:</strong> Biometric evidence is encrypted with AES-256 in transit and at rest. Raw captured selfie images are retained only for the Tenant&rsquo;s configured audit window (e.g., 30 to 90 days) and are subsequently permanently purged from object storage.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Smartphone className="text-[#018074]" size={24} />
              5. Device Integrity, Anti-Spoofing & Security Verification
            </h2>
            <p>
              To ensure platform trustworthiness, Liqaa collects hardware and system telemetry:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Mock Location / GPS Spoofing Detection:</strong> We inspect system flags to detect virtual location providers or mock GPS apps.</li>
              <li><strong>Device Binding & UUID:</strong> Cryptographically generated device tokens ensure attendance punches originate from registered, employer-approved physical hardware.</li>
              <li><strong>Tamper & Root/Jailbreak Detection:</strong> We verify operating system integrity via Apple DeviceCheck / Google Play Integrity APIs to block compromised environments.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Database className="text-[#018074]" size={24} />
              6. Information We Collect & Categories of Data
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#CBD5E1] bg-[#F1F5F9]">
                    <th className="p-3 font-bold text-[#0F172A]">Category</th>
                    <th className="p-3 font-bold text-[#0F172A]">Data Collected</th>
                    <th className="p-3 font-bold text-[#0F172A]">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  <tr>
                    <td className="p-3 font-semibold">Tenant Account Data</td>
                    <td className="p-3">Company name, business email, billing address, tax ID, phone.</td>
                    <td className="p-3">Workspace setup, invoicing, enterprise license governance.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Employee Profile Data</td>
                    <td className="p-3">Full name, official email, employee ID, department, designation.</td>
                    <td className="p-3">Authentication, permissions allocation, organizational chart.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Attendance & Leaves</td>
                    <td className="p-3">Punch-in/out timestamps, shift rosters, regularization notes, leave balances.</td>
                    <td className="p-3">Payroll calculation, statutory overtime tracking, timesheets.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold">Payroll & Financials</td>
                    <td className="p-3">Bank account details, salary components, statutory deductions (PF, Tax).</td>
                    <td className="p-3">Automated payslip distribution and direct payout reconciliation.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <RefreshCw className="text-[#018074]" size={24} />
              7. Data Retention & Deletion
            </h2>
            <p>
              We retain customer data for as long as the Tenant maintains an active subscription. Upon workspace termination or written tenant request:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>All transactional attendance, payroll, and shift records are preserved for a 30-day grace period to allow data export.</li>
              <li>After 30 days, tenant database records and associated object storage buckets are permanently and securely destroyed.</li>
              <li>Employees wishing to delete biometric profiles may submit requests to their Employer Administrator or directly to <code>privacy@liqaahq.com</code>.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
              <Lock className="text-[#018074]" size={24} />
              8. Security Measures & Subprocessors
            </h2>
            <p>
              Liqaa enforces enterprise-grade defense-in-depth security:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li><strong>Encryption:</strong> TLS 1.3 for all data in transit; AES-256 encryption for database volumes and S3 object storage at rest.</li>
              <li><strong>Multi-Tenant Isolation:</strong> Logical and schema-level isolation ensures no tenant can access cross-workspace records.</li>
              <li><strong>Subprocessors:</strong> We host infrastructure in ISO 27001 / SOC 2 certified AWS facilities (EU/Stockholm region) with automated disaster recovery backups.</li>
            </ul>
          </section>

          <section className="space-y-4 pt-6 border-t border-[#E5E7EB]">
            <h2 className="text-2xl font-bold text-[#0F172A]">9. Contact Our Data Protection Officer</h2>
            <p>
              If you have any questions about this Privacy Policy, your personal data, or wish to exercise your legal rights under GDPR, CCPA, or DPDP, please contact our Data Protection Officer:
            </p>
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm">
              <p><strong>Liqaa Privacy & Governance Office</strong></p>
              <p>Email: <a href="mailto:privacy@liqaahq.com" className="text-[#018074] font-semibold underline">privacy@liqaahq.com</a></p>
              <p>Website: <a href="https://liqaahq.com" className="text-[#018074] font-semibold underline">https://liqaahq.com</a></p>
            </div>
          </section>
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}
