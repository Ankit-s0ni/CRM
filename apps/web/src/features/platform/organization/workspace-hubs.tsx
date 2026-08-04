"use client";

import {
  Activity,
  BellRing,
  Blocks,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  MapPin,
  Network,
  PlayCircle,
  ReceiptText,
  ScrollText,
  Settings2,
  ShieldCheck,
  Umbrella,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { canAccessAttendanceWorkspace } from "@/lib/attendance-navigation";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  AdminPage,
  ErrorState,
  LoadingState,
  Panel,
} from "@/shared/components/page-primitives";
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

const PAYROLL_WORKSPACE_PERMISSIONS = [
  "payroll.settings.read",
  "payroll.policies.read",
  "payroll.components.read",
  "payroll.structures.read",
  "payroll.compensation.read",
  "payroll.accounting.read",
  "payroll.inputs.read",
  "payroll.inputs.manage",
  "payroll.runs.read",
  "payroll.runs.calculate",
  "payroll.runs.approve",
  "payroll.runs.finalize",
  "payroll.payslips.read",
  "payroll.payslips.self",
  "payroll.payslips.publish",
  "payroll.reports.generate",
  "attendance.reports.read",
  "attendance.reports.generate",
  "attendance.payroll-lock.manage",
];

function hasAnyPermission(
  permissions: ReadonlySet<string>,
  keys: readonly string[],
) {
  return keys.some((permission) => permissions.has(permission));
}

export function ModulesHub() {
  const { tText } = useTenantLocalization();
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? EMPTY_PERMISSIONS),
  );
  const [modules, setModules] = useState<WorkspaceModule[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<{ modules: WorkspaceModule[] }>("/workspace/modules")
      .then(({ data }) => setModules(data.modules))
      .catch(() =>
        setError(tText("Enabled modules could not be loaded.")),
      );
  }, []);

  const attendance = modules?.find(({ key }) => key === "ATTENDANCE");
  const attendanceAddOns = modules?.filter(({ key }) =>
    ["FIELD_TRACKING", "REGULARIZATION"].includes(key),
  );
  const payroll = modules?.find(({ key }) => key === "PAYROLL");
  const canOpenPayroll = hasAnyPermission(
    permissions,
    PAYROLL_WORKSPACE_PERMISSIONS,
  );
  const shouldShowPayrollEnablement =
    !payroll && hasAnyPermission(permissions, PAYROLL_WORKSPACE_PERMISSIONS);
  return (
    <AdminPage
      title={tText("Modules")}
      description={tText(
        "Choose a module to configure organization-level setup. Daily work stays on Home, Employees, and Reports.",
      )}
    >
      {error && <ErrorState message={error} />}
      {!modules ? (
        <LoadingState />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {attendance && canAccessAttendanceWorkspace(permissions) && (
            <Link
              className="group rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2a2927] hover:shadow-md"
              href="/app/modules/attendance"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-zinc-100 text-[#151515]">
                  <ClipboardCheck className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold">
                      {tText("Attendance")}
                    </h2>
                    <ChevronRight className="size-5 text-outline transition group-hover:translate-x-1 group-hover:text-[#151515]" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {tText(
                      "Attendance setup for policies, offices, shifts, rosters, holidays, devices, and security.",
                    )}
                  </p>
                  <span className="mt-4 inline-flex rounded-full theme-tone theme-tone-emerald px-3 py-1 text-xs font-bold">
                    {tText("Enabled")}
                  </span>
                  {attendanceAddOns?.map((module) => (
                    <span
                      className="ml-2 mt-4 inline-flex rounded-full bg-zinc-50 px-3 py-1 text-xs font-bold text-[#151515]"
                      key={module.key}
                    >
                      {localizedModuleName(module.key, module.name, tText)}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          )}
          {payroll && canOpenPayroll && (
              <Link
                className="group rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2a2927] hover:shadow-md"
                href="/app/modules/payroll"
              >
                <div className="flex items-start gap-4">
                  <span className="grid size-12 place-items-center rounded-xl bg-zinc-100 text-[#151515]">
                    <WalletCards className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold">
                        {tText("Payroll")}
                      </h2>
                      <ChevronRight className="size-5 text-outline" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {tText(
                        "Company payroll setup for pay groups, salary rules, approval steps, and accounting links.",
                      )}
                    </p>
                    <span className="mt-4 inline-flex rounded-full theme-tone theme-tone-emerald px-3 py-1 text-xs font-bold">
                      {tText("Enabled")}
                    </span>
                  </div>
                </div>
              </Link>
            )}
          {shouldShowPayrollEnablement && (
            <Panel className="rounded-2xl border theme-tone theme-tone-amber p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white theme-tone-text">
                  <WalletCards className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">Payroll</h2>
                  <p className="mt-2 text-sm leading-6 theme-tone-text">
                    Your role has payroll permissions, but Payroll is not
                    enabled for this workspace yet. Enable the PAYROLL module
                    from platform tenant modules before using payroll screens.
                  </p>
                  <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold theme-tone-text">
                    Needs workspace enablement
                  </span>
                </div>
              </div>
            </Panel>
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
                className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm transition hover:border-[#2a2927] hover:shadow-md"
                href="/app/settings/modules"
                key={module.key}
              >
                <div className="flex items-start gap-4">
                  <span className="grid size-12 place-items-center rounded-xl bg-zinc-50 text-zinc-500">
                    <Building2 className="size-6" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold">
                      {localizedModuleName(module.key, module.name, tText)}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      {tText(
                        "Review this enabled service, its dependencies, and its current configuration health.",
                      )}
                    </p>
                  </div>
                  <ChevronRight className="ml-auto size-5 text-outline" />
                </div>
              </Link>
            ))}
          {!modules.length && (
            <Panel className="p-8 text-sm text-zinc-500">
              {tText("No business modules are enabled for this workspace.")}
            </Panel>
          )}
        </div>
      )}
      {permissions.size === 0 && (
        <div className="mt-5">
          <ErrorState
            message={tText(
              "Your permissions are still loading. Refresh before making policy changes.",
            )}
          />
        </div>
      )}
    </AdminPage>
  );
}

export function AttendanceModuleHub() {
  return <AttendanceOverview />;
}

export function SettingsHub() {
  const { tText } = useTenantLocalization();
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? EMPTY_PERMISSIONS),
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

  const rawSections: SettingsSection[] = [
    {
      title: tText("Company foundation"),
      description:
        tText("Start here. Set the company identity and organization structure used by every module."),
      links: [
        {
          title: tText("Company settings"),
          description:
            tText("Workspace identity, branding, timezone, locale, and onboarding details."),
          href: "/app/settings/company",
          icon: Building2,
          permissions: ["workspace.settings.read"],
          healthKey: "COMPANY",
        },
        {
          title: tText("Organization structure"),
          description:
            tText("Departments, designations, reporting hierarchy, and employee organization."),
          href: "/app/settings/organization",
          icon: Network,
          permissions: ["organization.departments.read"],
          healthKey: "ORGANIZATION",
        },
      ],
    },
    {
      title: tText("People and access"),
      description:
        tText("Invite administrators, assign permissions, and review which DeltCRM tools are enabled."),
      links: [
        {
          title: tText("Admin access"),
          description:
            tText("Invite administrators, HR and managers, and review elevated access."),
          href: "/app/settings/access",
          icon: ShieldCheck,
          permissions: ["identity.roles.read"],
          healthKey: "ACCESS",
        },
        {
          title: tText("Modules and entitlements"),
          description:
            tText("Review subscribed tools, operational readiness, and configuration entry points."),
          href: "/app/settings/modules",
          icon: Blocks,
          permissions: ["workspace.modules.read"],
          healthKey: "MODULES",
        },
      ],
    },
    {
      title: tText("Configure enabled modules"),
      description:
        tText("Set the policies and defaults employees will follow. Only enabled modules appear here."),
      links: [
        {
          title: tText("Attendance settings"),
          description:
            tText("Working week, offices, policies, verification, shifts, rosters, and holidays."),
          href: "/app/attendance/policies",
          icon: ClipboardCheck,
          permissions: ["attendance.config.read", "attendance.config.manage"],
          moduleKey: "ATTENDANCE",
          healthKey: "ATTENDANCE",
        },
        {
          title: tText("Payroll settings"),
          description:
            tText("Review payroll dependencies, export readiness, and period-close controls."),
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
      title: tText("Governance and subscription"),
      description:
        tText("Review activity, your notification inbox, and the commercial workspace subscription."),
      links: [
        {
          title: tText("Audit history"),
          description:
            tText("Search attributed workspace changes, impersonation activity, and before/after evidence."),
          href: "/app/settings/audit",
          icon: ScrollText,
          permissions: ["workspace.audit.read"],
          healthKey: "AUDIT",
        },
        {
          title: tText("My notification preferences"),
          description:
            tText("Choose how optional notices reach your account and review mandatory events."),
          href: "/app/settings/notifications",
          icon: BellRing,
          permissions: ["notifications.self"],
          healthKey: "NOTIFICATIONS",
        },
        {
          title: tText("Security controls"),
          description:
            tText("Review trusted devices, biometric behavior, verification evidence, and alert rules."),
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
          title: tText("Integrations"),
          description:
            tText("Check which deployment services are available without exposing provider credentials."),
          href: "/app/settings/integrations",
          icon: Activity,
          permissions: ["workspace.settings.read"],
          healthKey: "INTEGRATIONS",
        },
        {
          title: tText("Billing and subscription"),
          description:
            tText("Manage plans, employee seats, payment methods and GST invoices."),
          href: "/app/settings/billing",
          icon: Landmark,
          permissions: ["billing.subscription.read"],
          healthKey: "BILLING",
        },
      ],
    },
  ];
  const sections = rawSections.map((section) => ({
    ...section,
    title: tText(section.title),
    description: tText(section.description),
    links: section.links.map((link) => ({
      ...link,
      title: tText(link.title),
      description: tText(link.description),
    })),
  }));

  return (
    <AdminPage
      title={tText("Settings")}
      description={tText(
        "Set up the workspace in order. Each step opens the real configuration already used by DeltCRM.",
      )}
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
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#151515] text-sm font-bold text-white">
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
                          "group rounded-xl border border-surface-variant bg-white p-5 shadow-sm transition hover:border-[#2a2927] hover:shadow-md",
                        )}
                        href={href}
                        key={href}
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid size-10 place-items-center rounded-xl bg-zinc-50 text-[#151515]">
                            <Icon className="size-5" />
                          </span>
                          <ChevronRight className="ml-auto size-5 text-zinc-400 group-hover:text-[#151515]" />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">{title}</h3>
                          {readiness && <HealthPill value={readiness.status} />}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {description}
                        </p>
                        {readiness?.issues[0] && (
                          <p className="mt-3 text-xs font-medium theme-tone-text">
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
  const { tText } = useTenantLocalization();
  const attendance = health.ATTENDANCE?.configuration ?? {};
  const organization = health.ORGANIZATION?.configuration ?? {};
  const steps = [
    {
      title: tText("Company profile"),
      description: tText(
        "Confirm company identity, logo, timezone and locale.",
      ),
      href: "/app/settings/company",
      icon: Building2,
      complete: health.COMPANY?.status === "READY",
    },
    {
      title: tText("Organization structure"),
      description: tText("Create departments and reusable designations."),
      href: "/app/settings/organization",
      icon: Network,
      complete:
        (organization.departments ?? 0) > 0 &&
        (organization.designations ?? 0) > 0,
    },
    {
      title: tText("Office and geofence"),
      description: tText(
        "Define the physical workplace and allowed punch radius.",
      ),
      href: "/app/attendance/offices",
      icon: MapPin,
      complete: (attendance.offices ?? 0) > 0,
    },
    {
      title: tText("Attendance rules"),
      description: tText(
        "Create a shift, policy and default policy assignment.",
      ),
      href: "/app/attendance/policies",
      icon: ClipboardCheck,
      complete:
        (attendance.shifts ?? 0) > 0 &&
        (attendance.policies ?? 0) > 0 &&
        (attendance.assignments ?? 0) > 0,
    },
    {
      title: tText("Add employees"),
      description: tText(
        "Add manually or import employees after the foundation is ready.",
      ),
      href: "/app/employees",
      icon: UserPlus,
      complete: health.PEOPLE?.status === "READY",
    },
  ];
  const firstIncomplete = steps.findIndex(({ complete }) => !complete);

  return (
    <Panel className="mb-8 overflow-hidden border-zinc-200">
      <div className="border-b border-surface-variant bg-zinc-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#151515]">
          {tText("Workspace launch checklist")}
        </p>
        <h2 className="mt-1 text-xl font-bold">
          {tText("Set up in this order")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {tText(
            "Organization describes who reports where. Offices define where attendance may be recorded. Employees come after both foundations.",
          )}
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
                    ? "theme-tone theme-tone-emerald"
                    : index === firstIncomplete
                      ? "bg-[#151515] text-white"
                      : "bg-zinc-100 text-outline",
                )}
              >
                {step.complete ? <Check className="size-4" /> : index + 1}
              </span>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-50 text-[#151515]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm">{step.title}</strong>
                <span className="text-xs text-outline">{step.description}</span>
              </span>
              <span className="ml-auto shrink-0 text-xs font-semibold text-[#151515]">
                {step.complete
                  ? tText("Complete")
                  : index === firstIncomplete
                    ? tText("Continue setup")
                    : tText("Complete previous step")}
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
            <div
              className="flex items-center gap-3 p-4 opacity-60"
              key={step.title}
            >
              {content}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function ModuleSettingsView() {
  const { tText } = useTenantLocalization();
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
        if (active) setError(tText("Module entitlements could not be loaded."));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminPage
      title={tText("Modules and entitlements")}
      description={tText("Review commercially enabled tools, required dependencies, and configuration health.")}
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
          {tText("No modules are enabled. Review the subscription with the Business Admin or DeltCRM support.")}</Panel>
      )}
    </AdminPage>
  );
}

export function PayrollModuleHub() {
  const { tText } = useTenantLocalization();
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? EMPTY_PERMISSIONS),
  );
  const { health, error } = useModuleHealth("PAYROLL");
  return (
    <AdminPage
      title={tText("Payroll organization setup")}
      description={tText("Set the payroll rules for the whole company. Use Home, Employees, and Reports for daily payroll work.")}
    >
      {error && <ErrorState message={error} />}
      {!health && !error ? (
        <LoadingState />
      ) : (
        <>
          {health ? (
            <ModuleReadiness health={health} />
          ) : (
            <Panel className="border theme-tone theme-tone-amber p-5 text-sm leading-6 theme-tone-text">
              Payroll screens are available in the frontend, but this workspace
              has not passed the PAYROLL module health check. Enable the
              workspace module and refresh the session before running payroll.
            </Panel>
          )}
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Panel className="overflow-hidden">
              <div className="border-b border-border bg-gradient-to-r from-card via-muted to-card p-5">
                <h2 className="text-lg font-bold">{tText("Company payroll setup")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tText("Set these once, then update only when company rules change.")}
                </p>
              </div>
              <div className="grid gap-3 p-5 md:grid-cols-2">
                <WorkflowLink
                  description={tText("Country, currency, pay cycle, pay calendar, and pay groups.")}
                  href="/app/modules/payroll"
                  icon={WalletCards}
                  title={tText("Basic setup")}
                />
                <WorkflowLink
                  description={tText("Pay items, salary templates, and salary calculation rules.")}
                  href="/app/modules/payroll"
                  icon={Calculator}
                  title={tText("Salary setup")}
                />
                <WorkflowLink
                  description={tText("Fields every employee needs before payroll can run.")}
                  href="/app/modules/payroll"
                  icon={UserPlus}
                  title={tText("Employee requirements")}
                />
                <WorkflowLink
                  description={tText("Approval steps, account codes, and setup history.")}
                  href="/app/modules/payroll"
                  icon={FileSpreadsheet}
                  title={tText("Control and accounting")}
                />
              </div>
            </Panel>
            <Panel className="h-fit p-5">
              <h2 className="font-bold">{tText("Where daily work happens")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {tText("This module is only for setup. Use these places for regular payroll tasks.")}
              </p>
              <div className="mt-5 grid gap-3">
                {permissions.has("payroll.runs.read") && (
                  <WorkflowLink
                    description={tText("Create a monthly salary run by pay group.")}
                    href="/app/payroll/runs"
                    icon={PlayCircle}
                    title={tText("Run payroll")}
                  />
                )}
                {permissions.has("payroll.payslips.read") && (
                  <WorkflowLink
                    description={tText("Create and download employee payslips.")}
                    href="/app/modules/payroll/payslips"
                    icon={ReceiptText}
                    title={tText("Payslips")}
                  />
                )}
                <WorkflowLink
                  description={tText("Payroll register, bank file, and accounting file.")}
                  href="/app/reports?type=PAYROLL"
                  icon={FileSpreadsheet}
                  title={tText("Reports and files")}
                />
              </div>
            </Panel>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {permissions.has("attendance.payroll-lock.manage") && (
              <WorkflowLink
                description={tText("Lock a finished salary month or reopen it with a reason.")}
                href="/app/attendance/payroll"
                icon={LockKeyhole}
                key="close"
                title={tText("Close month")}
              />
            )}
            <WorkflowLink
              description={tText("Check attendance and leave data before salary is run.")}
              href="/app/settings/payroll"
              icon={Settings2}
              key="settings"
              title={tText("Payroll readiness")}
            />
          </div>
        </>
      )}
    </AdminPage>
  );
}

export function PayrollSettingsView() {
  const { tText } = useTenantLocalization();
  const { health, error } = useModuleHealth("PAYROLL");
  return (
    <AdminPage
      title={tText("Payroll settings")}
      description={tText("Payroll currently derives immutable evidence from Attendance and approved Leave.")}
    >
      {error && <ErrorState message={error} />}
      {!health ? (
        <LoadingState />
      ) : (
        <>
          <ModuleReadiness health={health} />
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <WorkflowLink
              description={tText("Working week, calculation thresholds, shifts, and policy assignments.")}
              href="/app/attendance/policies"
              icon={ClipboardCheck}
              title={tText("Attendance inputs")}
            />
            <WorkflowLink
              description={tText("Approved leave and balances flow into period evidence.")}
              href="/app/attendance/setup/leave"
              icon={Umbrella}
              title={tText("Leave inputs")}
            />
            <WorkflowLink
              description={tText("Generate the period export before attempting to close it.")}
              href="/app/reports?type=PAYROLL"
              icon={FileSpreadsheet}
              title={tText("Payroll exports")}
            />
          </div>
        </>
      )}
    </AdminPage>
  );
}

export function SecuritySettingsView() {
  const { tText } = useTenantLocalization();
  return (
    <AdminPage
      title={tText("Security controls")}
      description={tText("Manage Attendance trust from the existing device, verification, and alert workflows.")}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <WorkflowLink
          description={tText("Approve, block, or replace employee devices with an auditable reason.")}
          href="/app/attendance/devices"
          icon={ShieldCheck}
          title={tText("Trusted devices")}
        />
        <WorkflowLink
          description={tText("Configure location, selfie, face, and registered-device requirements.")}
          href="/app/modules/attendance/capabilities"
          icon={Settings2}
          title={tText("Verification behavior")}
        />
        <WorkflowLink
          description={tText("Review verification evidence, alert rules, and unresolved security events.")}
          href="/app/attendance/security"
          icon={CircleAlert}
          title={tText("Security feed and rules")}
        />
      </div>
    </AdminPage>
  );
}

export function IntegrationSettingsView() {
  const { tText } = useTenantLocalization();
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
      .catch(() => setError(tText("Integration diagnostics could not be loaded.")));
  }, []);

  return (
    <AdminPage
      title={tText("Integrations")}
      description={tText("Check deployment-managed services used by this workspace.")}
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
  const { tText } = useTenantLocalization();
  const href = moduleHref(module.key);
  return (
    <Panel className="p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 place-items-center rounded-xl bg-zinc-50 text-[#151515]">
          <Blocks className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{module.name}</h2>
            <HealthPill value={health?.status ?? "CHECKING"} />
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {module.description ?? tText("DeltCRM workspace module")}
          </p>
        </div>
      </div>
      {health && <ModuleReadiness health={health} compact />}
      {href && (
        <Link
          className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#151515]"
          href={href}
        >
          {tText("Open configuration")}<ChevronRight className="size-4" />
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
  const { t, tText } = useTenantLocalization();
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-variant bg-white",
        compact ? "mt-5 p-4" : "p-6",
      )}
    >
      {!compact && (
        <div className="flex items-center gap-3">
          <Activity className="size-5 text-[#151515]" />
          <h2 className="font-bold">{tText("Configuration health")}</h2>
          <HealthPill value={health.status} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(health.configuration).map(([label, value]) => (
          <span
            className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-semibold text-on-surface-variant"
            key={label}
          >
            {configurationLabel(label, t)}: {value}
          </span>
        ))}
      </div>
      {health.issues.map((issue) => (
        <Link
          className="mt-3 flex items-start gap-2 rounded-lg theme-tone theme-tone-amber p-3 text-sm"
          href={issue.actionHref}
          key={issue.code}
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{healthIssueMessage(issue.message, t)}</span>
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
      className="group rounded-xl border border-surface-variant bg-white p-6 shadow-sm transition hover:border-[#2a2927] hover:shadow-md"
      href={href}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-zinc-50 text-[#151515]">
          <Icon className="size-5" />
        </span>
        <ChevronRight className="ml-auto size-5 text-zinc-400 group-hover:text-[#151515]" />
      </div>
      <h2 className="mt-5 font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </Link>
  );
}

function HealthPill({ value }: { value: string }) {
  const { t } = useTenantLocalization();
  const ready = ["READY", "CONFIGURED", "AVAILABLE"].includes(value);
  const blocked = ["BLOCKED", "NEEDS_CONFIGURATION"].includes(value);
  const neutral = ["NOT_ENABLED", "NOT_CONFIGURED", "CHECKING"].includes(value);
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold",
        ready
          ? "theme-tone theme-tone-emerald"
          : blocked
            ? "theme-tone theme-tone-red"
            : neutral
              ? "bg-zinc-100 text-zinc-500"
              : "theme-tone theme-tone-amber",
      )}
    >
      {healthStatusLabel(value, t)}
    </span>
  );
}

function healthStatusLabel(
  value: string,
  t: (key: string, fallback: string) => string,
) {
  const labels: Record<string, { key: string; fallback: string }> = {
    READY: { key: "tenant.health.ready", fallback: "Ready" },
    CONFIGURED: { key: "tenant.health.configured", fallback: "Configured" },
    AVAILABLE: { key: "tenant.health.available", fallback: "Available" },
    BLOCKED: { key: "tenant.health.blocked", fallback: "Blocked" },
    NEEDS_CONFIGURATION: {
      key: "tenant.health.needsConfiguration",
      fallback: "Needs configuration",
    },
    NEEDS_SETUP: { key: "tenant.health.needsSetup", fallback: "Needs setup" },
    NOT_ENABLED: { key: "tenant.health.notEnabled", fallback: "Not enabled" },
    NOT_CONFIGURED: {
      key: "tenant.health.notConfigured",
      fallback: "Not configured",
    },
    CHECKING: { key: "tenant.health.checking", fallback: "Checking" },
  };
  const label = labels[value];
  return label ? t(label.key, label.fallback) : value.replaceAll("_", " ");
}

function configurationLabel(
  label: string,
  t: (key: string, fallback: string) => string,
) {
  const labels: Record<string, { key: string; fallback: string }> = {
    completedExports: {
      key: "tenant.health.completedExports",
      fallback: "Completed exports",
    },
    lockedPeriods: {
      key: "tenant.health.lockedPeriods",
      fallback: "Locked periods",
    },
    activeEmployees: {
      key: "tenant.health.activeEmployees",
      fallback: "Active employees",
    },
    assignedPolicies: {
      key: "tenant.health.assignedPolicies",
      fallback: "Assigned policies",
    },
    configuredOffices: {
      key: "tenant.health.configuredOffices",
      fallback: "Configured offices",
    },
    configuredShifts: {
      key: "tenant.health.configuredShifts",
      fallback: "Configured shifts",
    },
  };
  const value = labels[label];
  return value ? t(value.key, value.fallback) : label.replaceAll(/([A-Z])/g, " $1").trim();
}

function healthIssueMessage(
  message: string,
  t: (key: string, fallback: string) => string,
) {
  const messages: Record<string, { key: string; fallback: string }> = {
    "Generate a payroll export before closing a period.":
      {
        key: "tenant.health.generatePayrollExportBeforeClosing",
        fallback: "Generate a payroll export before closing a period.",
      },
    "Generate a payroll export before locking the first month.":
      {
        key: "tenant.health.generatePayrollExportBeforeLocking",
        fallback: "Generate a payroll export before locking the first month.",
      },
  };
  const value = messages[message];
  return value ? t(value.key, value.fallback) : message;
}

function localizedModuleName(
  key: string,
  fallback: string,
  tText: (message: string) => string,
) {
  const sourceName: Record<string, string> = {
    ATTENDANCE: "Attendance",
    FIELD_TRACKING: "Field tracking",
    PAYROLL: "Payroll",
  };
  if (key === "REGULARIZATION") {
    return tText("Attendance regularization");
  }
  return tText(sourceName[key] ?? fallback);
}

function moduleHref(key: string) {
  if (key === "ATTENDANCE") return "/app/settings/attendance";
  if (key === "LEAVE") return "/app/attendance/setup/leave";
  if (key === "PAYROLL") return "/app/settings/payroll";
  if (["FIELD_TRACKING", "REGULARIZATION"].includes(key))
    return "/app/settings/attendance";
  return null;
}
