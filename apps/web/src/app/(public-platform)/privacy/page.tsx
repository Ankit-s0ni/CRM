import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, MapPin, Camera, Smartphone, Database, RefreshCw, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Liqaa Platform",
  description: "Privacy Policy and data governance for Liqaa Multi-Product Business Suite.",
};

export default function PlatformPrivacyPage() {
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
            <Shield size={14} /> Legal & Compliance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: {lastUpdated} | Version 2.4 (Enterprise & Mobile Suite)
          </p>
        </header>

        <article className="space-y-10 text-foreground leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="text-primary" size={20} />
              1. Scope & Roles (Controller vs. Processor)
            </h2>
            <p className="text-muted-foreground">
              In providing employee management, biometric verification, and mobile attendance tools, your Employer acts as the <strong>Data Controller</strong>, while Liqaa operates strictly as a <strong>Data Processor</strong> complying with GDPR, CCPA, and DPDP mandates.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <MapPin className="text-primary" size={20} />
              2. Precise Location Tracking (Foreground & Background)
            </h2>
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p>
                <strong>Office Geofencing:</strong> Uses foreground GPS (<code>ACCESS_FINE_LOCATION</code> / <code>NSLocationWhenInUse</code>) strictly during check-in to confirm the employee is inside the workplace perimeter.
              </p>
              <p>
                <strong>Active Field Tracking:</strong> Uses background location (<code>ACCESS_BACKGROUND_LOCATION</code> / <code>NSLocationAlways</code>) strictly during active on-duty field shifts.
              </p>
              <p className="font-semibold text-primary">
                Hard Boundary: Location recording terminates immediately upon check-out. Liqaa never captures personal off-duty location data.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Camera className="text-primary" size={20} />
              3. Facial Verification & Anti-Proxy Attendance
            </h2>
            <p className="text-muted-foreground">
              When required by your organization, camera hardware (<code>CAMERA</code>) performs liveness and facial match verification. Biometric evidence is encrypted with AES-256 and raw selfie photos are purged automatically in accordance with employer retention rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Smartphone className="text-primary" size={20} />
              4. Anti-Spoofing & Device Integrity
            </h2>
            <p className="text-muted-foreground">
              We verify device authenticity, blocking fake GPS spoofers, emulators, and tampered operating systems through cryptographic hardware tokens.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Lock className="text-primary" size={20} />
              5. Data Security, Isolation & Contact
            </h2>
            <p className="text-muted-foreground">
              Data is housed in isolated tenant databases with TLS 1.3 in-transit and AES-256 at-rest encryption in SOC 2 / ISO 27001 certified AWS cloud environments.
            </p>
            <p className="text-muted-foreground">
              For privacy queries or deletion requests, contact: <strong>privacy@liqaahq.com</strong>.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
