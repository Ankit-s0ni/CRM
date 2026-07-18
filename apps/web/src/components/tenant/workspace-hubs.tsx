"use client";

import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileClock,
  FileSpreadsheet,
  Landmark,
  MapPinned,
  MonitorSmartphone,
  ShieldCheck,
  SlidersHorizontal,
  Siren,
  TableProperties,
  LockKeyhole,
  Umbrella,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { AdminPage, ErrorState, LoadingState, Panel } from "./page-primitives";

type WorkspaceModule = { key: string; name: string; activatedAt: string };

type HubLink = {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardCheck;
  permission: string;
};

const attendanceGroups: Array<{ title: string; description: string; links: HubLink[] }> = [
  {
    title: "Daily operations",
    description: "Monitor attendance, exceptions, and field activity.",
    links: [
      { title: "Attendance register", description: "Review daily attendance and employee records.", href: "/app/attendance/register", icon: TableProperties, permission: "attendance.records.read" },
      { title: "OD & WFH requests", description: "Review attendance exceptions and requests.", href: "/app/attendance/exceptions", icon: CalendarDays, permission: "attendance.exceptions.read" },
      { title: "Attendance corrections", description: "Approve employee regularization requests and recompute days.", href: "/app/attendance/regularizations", icon: FileClock, permission: "attendance.regularizations.manage" },
      { title: "Field operations", description: "See live field teams and route history.", href: "/app/attendance/field", icon: MapPinned, permission: "attendance.field.live.read" },
    ],
  },
  {
    title: "Reports and payroll",
    description: "Generate snapshot exports and close finalized attendance months.",
    links: [
      { title: "Reports center", description: "Run muster, payroll, late/OT, violations, and distance exports.", href: "/app/attendance/reports", icon: FileSpreadsheet, permission: "attendance.reports.read" },
      { title: "Payroll close", description: "Lock, reopen, and audit payroll periods.", href: "/app/attendance/payroll", icon: LockKeyhole, permission: "attendance.payroll-lock.manage" },
    ],
  },
  {
    title: "Policies and schedules",
    description: "Configure how attendance is calculated for this workspace.",
    links: [
      { title: "Employee app behavior", description: "Control tenant capabilities and the mobile app boundary.", href: "/app/modules/attendance/capabilities", icon: SlidersHorizontal, permission: "attendance.config.read" },
      { title: "Attendance defaults", description: "Set tenant-wide attendance rules.", href: "/app/settings/attendance", icon: SlidersHorizontal, permission: "attendance.config.manage" },
      { title: "Policies", description: "Manage policy rules and employee assignments.", href: "/app/attendance/policies", icon: ClipboardCheck, permission: "attendance.policies.read" },
      { title: "Shifts and rosters", description: "Define work schedules and publish rosters.", href: "/app/attendance/shifts", icon: Clock3, permission: "attendance.shifts.read" },
      { title: "Offices and holidays", description: "Manage work locations, geofences, and calendars.", href: "/app/attendance/offices", icon: Landmark, permission: "attendance.offices.read" },
    ],
  },
  {
    title: "Trust and compliance",
    description: "Manage employee devices and investigate security signals.",
    links: [
      { title: "Employee devices", description: "Approve, replace, or block registered devices.", href: "/app/attendance/devices", icon: MonitorSmartphone, permission: "attendance.devices.read" },
      { title: "Security feed", description: "Review verification alerts and follow up safely.", href: "/app/attendance/security", icon: Siren, permission: "attendance.security-alerts.read" },
    ],
  },
];

export function ModulesHub() {
  const permissions = new Set(useAuthStore((state) => state.user?.permissions ?? []));
  const [modules, setModules] = useState<WorkspaceModule[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<{ modules: WorkspaceModule[] }>("/workspace/modules")
      .then(({ data }) => setModules(data.modules))
      .catch(() => setError("Enabled modules could not be loaded."));
  }, []);

  const attendance = modules?.find(({ key }) => key === "ATTENDANCE");
  return (
    <AdminPage
      title="Modules"
      description="Choose a product area, then manage its operations, policies, and controls in one place."
    >
      {error && <ErrorState message={error} />}
      {!modules ? <LoadingState /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {attendance && (
            <Link
              className="group rounded-2xl border border-[#d9d5e5] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#4f46e5] hover:shadow-md"
              href="/app/modules/attendance"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-[#e2dfff] text-[#3525cd]"><ClipboardCheck className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{attendance.name}</h2><ChevronRight className="size-5 text-[#777587] transition group-hover:translate-x-1 group-hover:text-[#3525cd]" /></div>
                  <p className="mt-2 text-sm leading-6 text-[#5e5b68]">Policies, schedules, attendance operations, device trust, and field monitoring.</p>
                  <span className="mt-4 inline-flex rounded-full bg-[#d8f8df] px-3 py-1 text-xs font-bold text-[#005320]">Enabled</span>
                </div>
              </div>
            </Link>
          )}
          {modules.filter(({ key }) => key === "LEAVE").map((module) => (
            <Link
              className="group rounded-2xl border border-[#d9d5e5] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#4f46e5] hover:shadow-md"
              href="/app/modules/leave"
              key={module.key}
            >
              <div className="flex items-start gap-4"><span className="grid size-12 place-items-center rounded-xl bg-[#e2dfff] text-[#3525cd]"><Umbrella className="size-6" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">{module.name}</h2><ChevronRight className="size-5 text-[#777587]" /></div><p className="mt-2 text-sm leading-6 text-[#5e5b68]">Balances, requests, approval coverage, and attendance integration.</p><span className="mt-4 inline-flex rounded-full bg-[#d8f8df] px-3 py-1 text-xs font-bold text-[#005320]">Enabled</span></div></div>
            </Link>
          ))}
          {modules.filter(({ key }) => !["ATTENDANCE", "LEAVE"].includes(key)).map((module) => (
            <Panel className="p-6" key={module.key}>
              <div className="flex items-start gap-4"><span className="grid size-12 place-items-center rounded-xl bg-[#f0ecf9] text-[#5e5b68]"><Building2 className="size-6" /></span><div><h2 className="text-lg font-bold">{module.name}</h2><p className="mt-2 text-sm text-[#5e5b68]">This module is enabled. Its operational workspace will appear here as it is released.</p></div></div>
            </Panel>
          ))}
          {!modules.length && <Panel className="p-8 text-sm text-[#5e5b68]">No business modules are enabled for this workspace.</Panel>}
        </div>
      )}
      {permissions.size === 0 && <div className="mt-5"><ErrorState message="Your permissions are still loading. Refresh before making policy changes." /></div>}
    </AdminPage>
  );
}

export function AttendanceModuleHub() {
  const permissions = new Set(useAuthStore((state) => state.user?.permissions ?? []));
  return (
    <AdminPage
      title="Attendance"
      description="Run daily attendance, then configure the policies and trust controls that support it."
    >
      <div className="space-y-7">
        {attendanceGroups.map((group) => {
          const links = group.links.filter(({ permission }) => permissions.has(permission));
          if (!links.length) return null;
          return (
            <section key={group.title}>
              <div className="mb-3"><h2 className="text-lg font-bold">{group.title}</h2><p className="text-sm text-[#5e5b68]">{group.description}</p></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {links.map(({ title, description, href, icon: Icon }) => (
                  <Link className="group rounded-xl border border-[#e4e1ee] bg-white p-5 shadow-sm transition hover:border-[#4f46e5] hover:shadow-md" href={href} key={href}>
                    <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[#f0ecf9] text-[#3525cd]"><Icon className="size-5" /></span><ChevronRight className="ml-auto size-4 text-[#a19ead] transition group-hover:translate-x-0.5 group-hover:text-[#3525cd]" /></div>
                    <h3 className="mt-4 font-bold">{title}</h3><p className="mt-1 text-sm leading-5 text-[#5e5b68]">{description}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AdminPage>
  );
}

export function SettingsHub() {
  const permissions = new Set(useAuthStore((state) => state.user?.permissions ?? []));
  const links: HubLink[] = [
    { title: "Company settings", description: "Workspace identity, company defaults, and onboarding details.", href: "/app/settings/company", icon: Building2, permission: "workspace.settings.read" },
    { title: "Users and roles", description: "Invite HR users and control their access by role.", href: "/app/access", icon: ShieldCheck, permission: "identity.roles.read" },
    { title: "Billing and subscription", description: "Manage plans, employee seats, payment methods and GST invoices.", href: "/app/settings/billing", icon: Landmark, permission: "billing.subscription.read" },
  ];
  return (
    <AdminPage title="Settings" description="Manage the workspace itself. Module-specific policies stay inside their module.">
      <div className="grid gap-4 md:grid-cols-2">
        {links.filter(({ permission }) => permissions.has(permission)).map(({ title, description, href, icon: Icon }) => (
          <Link className={cn("group rounded-xl border border-[#e4e1ee] bg-white p-6 shadow-sm transition hover:border-[#4f46e5] hover:shadow-md")} href={href} key={href}>
            <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#f0ecf9] text-[#3525cd]"><Icon className="size-5" /></span><ChevronRight className="ml-auto size-5 text-[#a19ead] group-hover:text-[#3525cd]" /></div><h2 className="mt-5 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#5e5b68]">{description}</p>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
