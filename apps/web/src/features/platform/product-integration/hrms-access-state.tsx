"use client";

import { CircleAlert, LockKeyhole, PackageX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HRMS_ROOT } from "@/lib/hrms-route-contract";
import { useTenantLocalization } from "@/lib/tenant-localization";

export type HrmsAccessStateVariant =
  | "unauthorized"
  | "subscription-required"
  | "unavailable";

export function HrmsAccessState({
  variant,
}: {
  variant: HrmsAccessStateVariant;
}) {
  const { tText } = useTenantLocalization();
  const content =
    variant === "unauthorized"
      ? {
          icon: LockKeyhole,
          eyebrow: tText("Access restricted"),
          title: tText("You do not have access to this HRMS area"),
          description: tText(
            "Ask your workspace administrator to grant the required HRMS permission.",
          ),
          action: tText("Return to dashboard"),
          href: "/app",
        }
      : variant === "subscription-required"
        ? {
            icon: PackageX,
            eyebrow: tText("Subscription required"),
            title: tText("This HRMS capability is not enabled"),
            description: tText(
              "A Business Admin can review the workspace plan or ask the platform owner to enable this capability.",
            ),
            action: tText("Review workspace modules"),
            href: "/app/settings/billing",
          }
        : {
            icon: CircleAlert,
            eyebrow: tText("Service unavailable"),
            title: tText("HRMS is temporarily unavailable"),
            description: tText(
              "Your data is safe. Wait a moment and try opening HRMS again.",
            ),
            action: tText("Try HRMS again"),
            href: HRMS_ROOT,
          };
  const Icon = content.icon;

  return (
    <main className="grid min-h-[calc(100vh-8rem)] place-items-center px-5 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-10">
        <div className="mb-7 grid size-14 place-items-center rounded-2xl bg-muted text-primary">
          <Icon aria-hidden="true" className="size-7" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          {content.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          {content.title}
        </h1>
        <p className="mt-4 max-w-prose text-base leading-7 text-on-surface-variant">
          {content.description}
        </p>
        <Link
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={content.href}
        >
          {content.action}
        </Link>
      </section>
    </main>
  );
}
