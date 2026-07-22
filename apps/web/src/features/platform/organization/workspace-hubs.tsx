"use client";

import {
  Activity,
  BellRing,
  Blocks,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  MapPin,
  Network,
  ScrollText,
  Settings2,
  ShieldCheck,
  Umbrella,
  UserPlus,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { canAccessAttendanceWorkspace } from "@/lib/attendance-navigation";
import { AdminPage, ErrorState, LoadingState, Panel } from "@/shared/components/page-primitives";
import { AttendanceOverview } from "./attendance-workspaces";

type WorkspaceModule = {
  key: string;
  name: string;
  description: string | null;
  availability: "AVAILABLE" | "COMING_SOON" | "DEPRECATED";
  dependencyKeys: string[];
  conflictKeys: string[];
  activatedAt: string;
};

type ModuleHealth = {
  module: WorkspaceModule;
  status: "READY" | "NEEDS_SETUP" | "BLOCKED";
  dependencies: { required: string[]; missing: string[] };
  configuration: Record<string, number>;
  issues: Array<{
    code: string;
    severity: string;
    message: string;
    actionHref: string;
  }>;
};

type HubLink = {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardCheck;
  permissions: string[];
  moduleKey?: string;
  healthKey?: string;
};

type SettingsSection = {
  title: string;
  description: string;
  links: HubLink[];
};

type SettingsHealthCategory = {
  key: string;
  status: "READY" | "NEEDS_SETUP";
  configuration: Record<string, number>;
  issues: Array<{
    code: string;
    severity: string;
    message: string;
    actionHref: string;
    count?: number;
  }>;
};

type IntegrationProvider = {
  key: string;
  name: string;
  status: "CONFIGURED" | "AVAILABLE" | "NOT_ENABLED" | "NEEDS_CONFIGURATION";
  message: string;
};

export function ModulesHub() {
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? []),
  );
  const [modules, setModules] = useState<WorkspaceModule[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<{ modules: WorkspaceModule[] }>("/workspace/modules")
      .then(({ data }) => setModules(data.modules))
      .catch(() => setError("Enabled modules could not be loaded."));
  }, []);

  const attendance = modules?.find(({ key }) => key === "ATTENDANCE");
  const attendanceAddOns = modules?.filter(({ key }) =>
    ["FIELD_TRACKING", "REGULARIZATION"].includes(key),
  );
  const payroll = modules?.find(({ key }) => key === "PAYROLL");
  return (
    <AdminPage
      title="Modules"
      description="Choose a product area, then manage its operations, policies, and controls in one place."
    >
      {error && <ErrorState message={error} />}
      {!modules ? (
        <LoadingState />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {attendance && canAccessAttendanceWorkspace(permissions) && (
            <Link
              className="group rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-container hover:shadow-md"
              href="/app/modules/attendance"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-zinc-100 text-primary">
                  <ClipboardCheck className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">{attendance.name}</h2>
                    <ChevronRight className="size-5 text-outline transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Policies, schedules, attendance, leave, device trust, and
                    field monitoring.
                  </p>
                  <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                    Enabled
                  </span>
                  {attendanceAddOns?.map((module) => (
                    <span
                      className="ml-2 mt-4 inline-flex rounded-full bg-zinc-50 px-3 py-1 text-xs font-bold text-primary"
                      key={module.key}
                    >
                      {module.name}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          )}
          {payroll &&
            [
              "attendance.reports.read",
              "attendance.reports.generate",
              "attendance.payroll-lock.manage",
            ].some((permission) => permissions.has(permission)) && (
              <Link
                className="group rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-container hover:shadow-md"
                href="/app/modules/payroll"
              >
                <div className="flex items-start gap-4">
                  <span className="grid size-12 place-items-center rounded-xl bg-zinc-100 text-primary">
                    <WalletCards className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold">{payroll.name}</h2>
                      <ChevronRight className="size-5 text-outline" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Generate payroll evidence, review completed exports, and
                      close finalized Attendance periods.
                    </p>
                    <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                      Enabled
                    </span>
                  </div>
                </div>
              </Link>
            )}
          {modules
            .filter(
              ({ key }) =>
                ![
                  "ATTENDANCE",
                  "LEAVE",
                  "PAYROLL",
                  "FIELD_TRACKING",
                  "REGULARIZATION",
                ].includes(key),
            )
            .map((module) => (
              <Link
                className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm transition hover:border-primary-container hover:shadow-md"
                href="/app/settings/modules"
                key={module.key}
              >
                <div className="flex items-start gap-4">
                  <span className="grid size-12 place-items-center rounded-xl bg-zinc-50 text-zinc-500">
                    <Building2 className="size-6" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold">{module.name}</h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      Review this enabled service, its dependencies, and its
                      current configuration health.
                    </p>
                  </div>
                  <ChevronRight className="ml-auto size-5 text-outline" />
                </div>
              </Link>
            ))}
          {!modules.length && (
            <Panel className="p-8 text-sm text-zinc-500">
              No business modules are enabled for this workspace.
            </Panel>
          )}
        </div>
      )}
      {permissions.size === 0 && (
        <div className="mt-5">
          <ErrorState message="Your permissions are still loading. Refresh before making policy changes." />
        </div>
      )}
    </AdminPage>
  );
}

export function AttendanceModuleHub() {
  return <AttendanceOverview />;
}

export function SettingsHub() {
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? []),
  );
  const [moduleKeys, setModuleKeys] = useState<Set<string>>(new Set());
  const [health, setHealth] = useState<Record<string, SettingsHealthCategory>>(
    {},
  );
  const [healthError, setHealthError] = useState("");
  const [healthLoaded, setHealthLoaded] = useState(false);
  const canReadModules = permissions.has("workspace.modules.read");
  const canReadSettingsHealth = permissions.has("workspace.settings.read");

  useEffect(() => {
    if (!canReadModules) return;
    apiClient
      .get<{ modules: WorkspaceModule[] }>("/workspace/modules")
      .then(({ data }) =>
        setModuleKeys(new Set(data.modules.map(({ key }) => key))),
      )
      .catch(() => undefined);
  }, [canReadModules]);

  useEffect(() => {
    if (!canReadSettingsHealth) return;
    apiClient
      .get<{
        data: { categories: SettingsHealthCategory[] };
      }>("/workspace/settings/health")
      .then(({ data }) =>
        setHealth(
          Object.fromEntries(
            data.data.categories.map((category) => [category.key, category]),
          ),
        ),
      )
      .catch(() => setHealthError("Setup readiness could not be loaded."))
      .finally(() => setHealthLoaded(true));
  }, [canReadSettingsHealth]);

  const sections: SettingsSection[] = [
    {
      title: "Company foundation",
      description:
        "Start here. Set the company identity and organization structure used by every module.",
      links: [
        {
          title: "Company settings",
          description:
            "Workspace identity, branding, timezone, locale, and onboarding details.",
          href: "/app/settings/company",
          icon: Building2,
          permissions: ["workspace.settings.read"],
          healthKey: "COMPANY",
        },
        {
          title: "Organization structure",
          description:
            "Departments, designations, reporting hierarchy, and employee organization.",
          href: "/app/settings/organization",
          icon: Network,
          permissions: ["organization.departments.read"],
          healthKey: "ORGANIZATION",
        },
      ],
    },
    {
      title: "People and access",
      description:
        "Invite administrators, assign permissions, and review which DeltCRM tools are enabled.",
      links: [
        {
          title: "Admin access",
          description:
            "Invite administrators, HR and managers, and review elevated access.",
          href: "/app/settings/access",
          icon: ShieldCheck,
          permissions: ["identity.roles.read"],
          healthKey: "ACCESS",
        },
        {
          title: "Modules and entitlements",
          description:
            "Review subscribed tools, operational readiness, and configuration entry points.",
          href: "/app/settings/modules",
          icon: Blocks,
          permissions: ["workspace.modules.read"],
          healthKey: "MODULES",
        },
      ],
    },
    {
      title: "Configure enabled modules",
      description:
        "Set the policies and defaults employees will follow. Only enabled modules appear here.",
      links: [
        {
          title: "Attendance settings",
          description:
            "Working week, offices, policies, verification, shifts, rosters, and holidays.",
          href: "/app/attendance/policies",
          icon: ClipboardCheck,
          permissions: ["attendance.config.read", "attendance.config.manage"],
          moduleKey: "ATTENDANCE",
          healthKey: "ATTENDANCE",
        },
        {
          title: "Payroll settings",
          description:
            "Review payroll dependencies, export readiness, and period-close controls.",
          href: "/app/settings/payroll",
          icon: WalletCards,
          permissions: [
            "attendance.reports.read",
            "attendance.payroll-lock.manage",
          ],
          moduleKey: "PAYROLL",
          healthKey: "PAYROLL",
        },
      ],
    },
    {
      title: "Governance and subscription",
      description:
        "Review activity, your notification inbox, and the commercial workspace subscription.",
      links: [
        {
          title: "Audit history",
          description:
            "Search attributed workspace changes, impersonation activity, and before/after evidence.",
          href: "/app/settings/audit",
          icon: ScrollText,
          permissions: ["workspace.audit.read"],
          healthKey: "AUDIT",
        },
        {
          title: "My notification preferences",
          description:
            "Choose how optional notices reach your account and review mandatory events.",
          href: "/app/settings/notifications",
          icon: BellRing,
          permissions: ["notifications.self"],
          healthKey: "NOTIFICATIONS",
        },
        {
          title: "Security controls",
          description:
            "Review trusted devices, biometric behavior, verification evidence, and alert rules.",
          href: "/app/settings/security",
          icon: ShieldCheck,
          permissions: [
            "attendance.devices.read",
            "attendance.security-alerts.read",
            "attendance.config.read",
          ],
          moduleKey: "ATTENDANCE",
          healthKey: "SECURITY",
        },
        {
          title: "Integrations",
          description:
            "Check which deployment services are available without exposing provider credentials.",
          href: "/app/settings/integrations",
          icon: Activity,
          permissions: ["workspace.settings.read"],
          healthKey: "INTEGRATIONS",
        },
        {
          title: "Billing and subscription",
          description:
            "Manage plans, employee seats, payment methods and GST invoices.",
          href: "/app/settings/billing",
          icon: Landmark,
          permissions: ["billing.subscription.read"],
          healthKey: "BILLING",
        },
      ],
    },
  ];
  return (
    <AdminPage
      title="Settings"
      description="Set up the workspace in order. Each step opens the real configuration already used by DeltCRM."
    >
      {healthError && <ErrorState message={healthError} />}
      {healthLoaded && <WorkspaceLaunchChecklist health={health} />}
      <div className="grid gap-7">
        {sections.map((section, index) => {
          const visibleLinks = section.links.filter(
            ({ permissions: required, moduleKey }) =>
              required.some((permission) => permissions.has(permission)) &&
              (!moduleKey || moduleKeys.has(moduleKey)),
          );
          if (!visibleLinks.length) return null;
          return (
            <section key={section.title}>
              <div className="mb-4 flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-lg font-bold">{section.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleLinks.map(
                  ({ title, description, href, icon: Icon, healthKey }) => {
                    const readiness = healthKey ? health[healthKey] : undefined;
                    return (
                      <Link
                        className={cn(
                          "group rounded-xl border border-surface-variant bg-white p-5 shadow-sm transition hover:border-primary-container hover:shadow-md",
                        )}
                        href={href}
                        key={href}
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid size-10 place-items-center rounded-xl bg-zinc-50 text-primary">
                            <Icon className="size-5" />
                          </span>
                          <ChevronRight className="ml-auto size-5 text-zinc-400 group-hover:text-primary" />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">{title}</h3>
                          {readiness && <HealthPill value={readiness.status} />}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {description}
                        </p>
                        {readiness?.issues[0] && (
                          <p className="mt-3 text-xs font-medium text-amber-800">
                            {readiness.issues[0].message}
                          </p>
                        )}
                      </Link>
                    );
                  },
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AdminPage>
  );
}

function WorkspaceLaunchChecklist({
  health,
}: {
  health: Record<string, SettingsHealthCategory>;
}) {
  const attendance = health.ATTENDANCE?.configuration ?? {};
  const steps = [
    {
      title: "Company profile",
      description: "Confirm company identity, logo, timezone and locale.",
      href: "/app/settings/company",
      icon: Building2,
      complete: health.COMPANY?.status === "READY",
    },
    {
      title: "Organization structure",
      description: "Create departments and reusable designations.",
      href: "/app/settings/organization",
      icon: Network,
      complete: health.ORGANIZATION?.status === "READY",
    },
    {
      title: "Office and geofence",
      description: "Define the physical workplace and allowed punch radius.",
      href: "/app/attendance/offices",
      icon: MapPin,
      complete: (attendance.offices ?? 0) > 0,
    },
    {
      title: "Attendance rules",
      description: "Create a shift, policy and default policy assignment.",
      href: "/app/attendance/policies",
      icon: ClipboardCheck,
      complete:
        (attendance.shifts ?? 0) > 0 &&
        (attendance.policies ?? 0) > 0 &&
        (attendance.assignments ?? 0) > 0,
    },
    {
      title: "Add employees",
      description: "Add manually or import employees after the foundation is ready.",
      href: "/app/employees",
      icon: UserPlus,
      complete: health.PEOPLE?.status === "READY",
    },
  ];
  const firstIncomplete = steps.findIndex(({ complete }) => !complete);

  return (
    <Panel className="mb-8 overflow-hidden border-zinc-200">
      <div className="border-b border-surface-variant bg-zinc-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
          Workspace launch checklist
        </p>
        <h2 className="mt-1 text-xl font-bold">Set up in this order</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Organization describes who reports where. Offices define where attendance may be recorded. Employees come after both foundations.
        </p>
      </div>
      <div className="grid divide-y divide-surface-variant">
        {steps.map((step, index) => {
          const available = index <= firstIncomplete || step.complete;
          const Icon = step.icon;
          const content = (
            <>
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                  step.complete
                    ? "bg-emerald-50 text-emerald-800"
                    : index === firstIncomplete
                      ? "bg-primary text-white"
                      : "bg-zinc-100 text-outline",
                )}
              >
                {step.complete ? <Check className="size-4" /> : index + 1}
              </span>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-50 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm">{step.title}</strong>
                <span className="text-xs text-outline">{step.description}</span>
              </span>
              <span className="ml-auto shrink-0 text-xs font-semibold text-primary">
                {step.complete ? "Complete" : index === firstIncomplete ? "Continue setup" : "Complete previous step"}
              </span>
              {available && <ChevronRight className="size-4 text-outline" />}
            </>
          );
          return available ? (
            <Link
              className="flex items-center gap-3 p-4 transition hover:bg-surface-variant"
              href={step.href}
              key={step.title}
            >
              {content}
            </Link>
          ) : (
            <div className="flex items-center gap-3 p-4 opacity-60" key={step.title}>
              {content}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function ModuleSettingsView() {
  const [modules, setModules] = useState<WorkspaceModule[] | null>(null);
  const [health, setHealth] = useState<Record<string, ModuleHealth>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient
      .get<{ modules: WorkspaceModule[] }>("/workspace/modules")
      .then(async ({ data }) => {
        if (!active) return;
        setModules(data.modules);
        const results = await Promise.all(
          data.modules.map(async (module) => {
            try {
              const response = await apiClient.get<{ data: ModuleHealth }>(
                `/workspace/modules/${module.key}/health`,
              );
              return [module.key, response.data.data] as const;
            } catch {
              return null;
            }
          }),
        );
        if (active) {
          setHealth(
            Object.fromEntries(
              results.filter(
                (result): result is readonly [string, ModuleHealth] =>
                  result !== null,
              ),
            ),
          );
        }
      })
      .catch(() => {
        if (active) setError("Module entitlements could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminPage
      title="Modules and entitlements"
      description="Review commercially enabled tools, required dependencies, and configuration health."
    >
      {error && <ErrorState message={error} />}
      {!modules ? (
        <LoadingState />
      ) : modules.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {modules.map((module) => (
            <ModuleHealthCard
              health={health[module.key]}
              key={module.key}
              module={module}
            />
          ))}
        </div>
      ) : (
        <Panel className="p-8 text-sm text-zinc-500">
          No modules are enabled. Review the subscription with the Business
          Admin or DeltCRM support.
        </Panel>
      )}
    </AdminPage>
  );
}

export function PayrollModuleHub() {
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? []),
  );
  const { health, error } = useModuleHealth("PAYROLL");
  return (
    <AdminPage
      title="Payroll"
      description="Create immutable payroll exports and close finalized Attendance periods."
    >
      {error && <ErrorState message={error} />}
      {!health ? (
        <LoadingState />
      ) : (
        <>
          <ModuleReadiness health={health} />
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {["attendance.reports.read", "attendance.reports.generate"].some(
              (permission) => permissions.has(permission),
            ) && (
              <WorkflowLink
                description="Generate and download a snapshot-based payroll CSV for a selected period."
                href="/app/reports/payroll"
                icon={FileSpreadsheet}
                key="reports"
                title="Payroll exports"
              />
            )}
            {permissions.has("attendance.payroll-lock.manage") && (
              <WorkflowLink
                description="Lock a completed month against its export or reopen it with an audited reason."
                href="/app/attendance/payroll"
                icon={LockKeyhole}
                key="close"
                title="Period close"
              />
            )}
            <WorkflowLink
              description="Review the Attendance and Leave inputs that determine payroll evidence."
              href="/app/settings/payroll"
              icon={Settings2}
              key="settings"
              title="Readiness and dependencies"
            />
          </div>
        </>
      )}
    </AdminPage>
  );
}

export function PayrollSettingsView() {
  const { health, error } = useModuleHealth("PAYROLL");
  return (
    <AdminPage
      title="Payroll settings"
      description="Payroll currently derives immutable evidence from Attendance and approved Leave."
    >
      {error && <ErrorState message={error} />}
      {!health ? (
        <LoadingState />
      ) : (
        <>
          <ModuleReadiness health={health} />
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <WorkflowLink
              description="Working week, calculation thresholds, shifts, and policy assignments."
              href="/app/attendance/policies"
              icon={ClipboardCheck}
              title="Attendance inputs"
            />
            <WorkflowLink
              description="Approved leave and balances flow into period evidence."
              href="/app/attendance/setup/leave"
              icon={Umbrella}
              title="Leave inputs"
            />
            <WorkflowLink
              description="Generate the period export before attempting to close it."
              href="/app/reports/payroll"
              icon={FileSpreadsheet}
              title="Payroll exports"
            />
          </div>
        </>
      )}
    </AdminPage>
  );
}

export function SecuritySettingsView() {
  return (
    <AdminPage
      title="Security controls"
      description="Manage Attendance trust from the existing device, verification, and alert workflows."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <WorkflowLink
          description="Approve, block, or replace employee devices with an auditable reason."
          href="/app/attendance/devices"
          icon={ShieldCheck}
          title="Trusted devices"
        />
        <WorkflowLink
          description="Configure location, selfie, face, and registered-device requirements."
          href="/app/modules/attendance/capabilities"
          icon={Settings2}
          title="Verification behavior"
        />
        <WorkflowLink
          description="Review verification evidence, alert rules, and unresolved security events."
          href="/app/attendance/security"
          icon={CircleAlert}
          title="Security feed and rules"
        />
      </div>
    </AdminPage>
  );
}

export function IntegrationSettingsView() {
  const [providers, setProviders] = useState<IntegrationProvider[] | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<{ data: { providers: IntegrationProvider[]; note: string } }>(
        "/workspace/integrations",
      )
      .then(({ data }) => {
        setProviders(data.data.providers);
        setNote(data.data.note);
      })
      .catch(() => setError("Integration diagnostics could not be loaded."));
  }, []);

  return (
    <AdminPage
      title="Integrations"
      description="Check deployment-managed services used by this workspace."
    >
      {error && <ErrorState message={error} />}
      {!providers ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <Panel className="p-6" key={provider.key}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">{provider.name}</h2>
                <HealthPill value={provider.status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {provider.message}
              </p>
            </Panel>
          ))}
        </div>
      )}
      {note && <p className="mt-5 text-sm text-zinc-500">{note}</p>}
    </AdminPage>
  );
}

function useModuleHealth(key: string) {
  const [health, setHealth] = useState<ModuleHealth | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiClient
      .get<{ data: ModuleHealth }>(`/workspace/modules/${key}/health`)
      .then(({ data }) => {
        if (active) setHealth(data.data);
      })
      .catch(() => {
        if (active)
          setError(`${key} is unavailable or you do not have access.`);
      });
    return () => {
      active = false;
    };
  }, [key]);
  return { health, error };
}

function ModuleHealthCard({
  module,
  health,
}: {
  module: WorkspaceModule;
  health?: ModuleHealth;
}) {
  const href = moduleHref(module.key);
  return (
    <Panel className="p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 place-items-center rounded-xl bg-zinc-50 text-primary">
          <Blocks className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{module.name}</h2>
            <HealthPill value={health?.status ?? "CHECKING"} />
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {module.description ?? "DeltCRM workspace module"}
          </p>
        </div>
      </div>
      {health && <ModuleReadiness health={health} compact />}
      {href && (
        <Link
          className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary"
          href={href}
        >
          Open configuration <ChevronRight className="size-4" />
        </Link>
      )}
    </Panel>
  );
}

function ModuleReadiness({
  health,
  compact = false,
}: {
  health: ModuleHealth;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-variant bg-white",
        compact ? "mt-5 p-4" : "p-6",
      )}
    >
      {!compact && (
        <div className="flex items-center gap-3">
          <Activity className="size-5 text-primary" />
          <h2 className="font-bold">Configuration health</h2>
          <HealthPill value={health.status} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(health.configuration).map(([label, value]) => (
          <span
            className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-on-surface-variant"
            key={label}
          >
            {label.replaceAll(/([A-Z])/g, " $1")}: {value}
          </span>
        ))}
      </div>
      {health.issues.map((issue) => (
        <Link
          className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          href={issue.actionHref}
          key={issue.code}
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{issue.message}</span>
          <ChevronRight className="ml-auto size-4 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

function WorkflowLink({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardCheck;
}) {
  return (
    <Link
      className="group rounded-xl border border-surface-variant bg-white p-6 shadow-sm transition hover:border-primary-container hover:shadow-md"
      href={href}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-zinc-50 text-primary">
          <Icon className="size-5" />
        </span>
        <ChevronRight className="ml-auto size-5 text-zinc-400 group-hover:text-primary" />
      </div>
      <h2 className="mt-5 font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </Link>
  );
}

function HealthPill({ value }: { value: string }) {
  const ready = ["READY", "CONFIGURED", "AVAILABLE"].includes(value);
  const blocked = ["BLOCKED", "NEEDS_CONFIGURATION"].includes(value);
  const neutral = ["NOT_ENABLED", "NOT_CONFIGURED", "CHECKING"].includes(value);
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold",
        ready
          ? "bg-emerald-100 text-emerald-900"
          : blocked
            ? "bg-red-100 text-on-error-container"
            : neutral
              ? "bg-zinc-100 text-zinc-500"
              : "bg-amber-100 text-amber-900",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function moduleHref(key: string) {
  if (key === "ATTENDANCE") return "/app/settings/attendance";
  if (key === "LEAVE") return "/app/attendance/setup/leave";
  if (key === "PAYROLL") return "/app/settings/payroll";
  if (["FIELD_TRACKING", "REGULARIZATION"].includes(key))
    return "/app/settings/attendance";
  return null;
}
