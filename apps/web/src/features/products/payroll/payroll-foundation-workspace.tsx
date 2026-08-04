"use client";

import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileClock,
  GitBranch,
  GripVertical,
  History,
  Layers3,
  LockKeyhole,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { cn } from "@/lib/utils";
import {
  AdminPage,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";

type PayrollTabKey =
  | "overview"
  | "settings"
  | "calendars"
  | "pay-groups"
  | "matrix"
  | "policies"
  | "components"
  | "structures"
  | "employee-profile"
  | "compensation"
  | "payment-details"
  | "statutory-details"
  | "approval-policies"
  | "accounting"
  | "audit";

type PayrollTab = {
  key: PayrollTabKey;
  label: string;
  endpoint: string;
  permission: string;
  managePermission?: string;
  icon: typeof WalletCards;
  description: string;
};

type ResourceState = {
  data: unknown;
  loading: boolean;
  error: string;
};

type FormState = Record<string, string | boolean>;

type PayLineAmountType = "fixed" | "percentage" | "formula";

type PayLineRule = {
  amountType: PayLineAmountType;
  fixedAmountMinor: string;
  formulaReference: string;
  percentage: string;
};

type AddedPayLine = {
  amountLabel: string;
  componentVersionId: string;
  fixedAmountMinor: string;
  formulaReference: string;
  label: string;
  percentageBasisPoints: string;
  required: boolean;
};

export const payrollFoundationTabs: PayrollTab[] = [
  {
    key: "overview",
    label: "Overview",
    endpoint: "",
    permission: "payroll.settings.read",
    icon: WalletCards,
    description: "See what is ready and what still needs setup.",
  },
  {
    key: "settings",
    label: "Company settings",
    endpoint: "/payroll/settings",
    permission: "payroll.settings.read",
    managePermission: "payroll.settings.manage",
    icon: Settings2,
    description: "Country, currency, pay cycle, payday, and rounding.",
  },
  {
    key: "calendars",
    label: "Pay calendar",
    endpoint: "/payroll/calendars",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: CalendarDays,
    description: "Salary periods and payment dates.",
  },
  {
    key: "pay-groups",
    label: "Pay groups",
    endpoint: "/payroll/pay-groups",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: Layers3,
    description: "Groups of employees paid in the same way.",
  },
  {
    key: "matrix",
    label: "Rule source",
    endpoint: "",
    permission: "payroll.policies.read",
    icon: GitBranch,
    description: "See which payroll rule is used for an employee.",
  },
  {
    key: "policies",
    label: "Salary rules",
    endpoint: "/payroll/policies",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: ScrollText,
    description: "Rules for working days, rounding, and partial salary.",
  },
  {
    key: "components",
    label: "Pay items",
    endpoint: "/payroll/components",
    permission: "payroll.components.read",
    managePermission: "payroll.components.manage",
    icon: Coins,
    description: "Basic salary, allowance, deduction, and contribution.",
  },
  {
    key: "structures",
    label: "Salary templates",
    endpoint: "/payroll/salary-structures",
    permission: "payroll.structures.read",
    managePermission: "payroll.structures.manage",
    icon: Banknote,
    description: "Reusable salary templates made from pay items.",
  },
  {
    key: "employee-profile",
    label: "Employee payroll fields",
    endpoint: "",
    permission: "payroll.compensation.read",
    managePermission: "payroll.compensation.manage",
    icon: UserRound,
    description: "Employee fields needed before salary can run.",
  },
  {
    key: "compensation",
    label: "Salary changes",
    endpoint: "",
    permission: "payroll.compensation.read",
    managePermission: "payroll.compensation.manage",
    icon: Banknote,
    description: "Employee salary revisions and effective dates.",
  },
  {
    key: "payment-details",
    label: "Bank details",
    endpoint: "",
    permission: "payroll.protected-data.read",
    managePermission: "payroll.protected-data.manage",
    icon: LockKeyhole,
    description: "Employee bank details used for salary payment.",
  },
  {
    key: "statutory-details",
    label: "Government IDs",
    endpoint: "",
    permission: "payroll.protected-data.read",
    managePermission: "payroll.protected-data.manage",
    icon: ShieldCheck,
    description: "Employee IDs required for local rules and records.",
  },
  {
    key: "approval-policies",
    label: "Approval flow",
    endpoint: "/payroll/approval-policies",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: BadgeCheck,
    description: "Who must check and approve payroll.",
  },
  {
    key: "accounting",
    label: "Accounting links",
    endpoint: "/payroll/accounting-mappings",
    permission: "payroll.accounting.read",
    managePermission: "payroll.accounting.manage",
    icon: FileClock,
    description: "Connect pay items to debit and credit account codes.",
  },
  {
    key: "audit",
    label: "Setup history",
    endpoint: "/payroll/audit?limit=25",
    permission: "payroll.audit.read",
    icon: History,
    description: "Changes made to payroll setup.",
  },
];

const today = new Date().toISOString().slice(0, 10);

export function PayrollFoundationWorkspace() {
  const { tText } = useTenantLocalization();
  const permissionList = useAuthStore((state) => state.user?.permissions ?? []);
  const permissions = useMemo(() => new Set(permissionList), [permissionList]);
  const visibleTabs = useMemo(
    () => payrollFoundationTabs.filter((tab) => permissions.has(tab.permission)),
    [permissions],
  );
  const [active, setActive] = useState<PayrollTabKey>(
    visibleTabs[0]?.key ?? "overview",
  );
  const [employeeId, setEmployeeId] = useState("");
  const activeKey = visibleTabs.some((tab) => tab.key === active)
    ? active
    : (visibleTabs[0]?.key ?? "overview");
  const tab = visibleTabs.find((item) => item.key === activeKey);

  return (
    <AdminPage
      title={tText("Payroll setup")}
      description={tText("Set up payroll once for your organization. Use Payroll runs for monthly salary work and Employees for employee details.")}
    >
      {!visibleTabs.length ? (
        <ErrorState message={tText("Your account does not have Payroll setup permissions.")} />
      ) : activeKey === "overview" ? (
        <PayrollOverview
          onOpen={setActive}
          permissions={permissions}
          visibleTabs={visibleTabs}
        />
      ) : tab ? (
        <div className="grid gap-5">
          <button
            className="w-fit rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            onClick={() => setActive("overview")}
            type="button"
          >
            {tText("Back to payroll setup")}
          </button>
          <PayrollTabPanel
            employeeId={employeeId}
            onEmployeeIdChange={setEmployeeId}
            permissions={permissions}
            tab={tab}
          />
        </div>
      ) : (
        <ErrorState message={tText("This payroll setup page is not available for your role.")} />
      )}
    </AdminPage>
  );
}

function PayrollTabPanel({
  employeeId,
  onEmployeeIdChange,
  permissions,
  tab,
}: {
  employeeId: string;
  onEmployeeIdChange: (value: string) => void;
  permissions: Set<string>;
  tab: PayrollTab;
}) {
  const { tText } = useTenantLocalization();
  const employeeEndpoint = endpointForEmployee(tab.key, employeeId);
  const endpoint = tab.endpoint || employeeEndpoint;
  const resource = usePayrollResource(endpoint);
  const canManage = Boolean(
    tab.managePermission && permissions.has(tab.managePermission),
  );
  const needsEmployee = employeeTabs.has(tab.key);
  const employees = usePayrollResource(needsEmployee ? "/employees?limit=100" : "");
  const employeeOptions = rows(employees.data).map((employee) => ({
    label: `${text(employee.fullName, tText("Unnamed employee"))} (${text(employee.employeeCode, "-")})`,
    value: text(employee.id, ""),
  })).filter((option) => option.value);

  return (
    <div className="grid gap-5">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <tab.icon className="size-5 text-foreground" />
              <h2 className="text-xl font-semibold text-zinc-900">
                {tText(tab.label)}
              </h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-zinc-500">
              {tText(tab.description)}
            </p>
          </div>
          <PrimaryButton disabled={!endpoint} onClick={resource.refresh}>
            <RefreshCw className="size-4" />
            {tText("Refresh")}
          </PrimaryButton>
        </div>
        {needsEmployee && (
          <div className="mt-5 max-w-xl">
            <EmployeeSelect
              error={employees.error}
              loading={employees.loading}
              onChange={onEmployeeIdChange}
              options={employeeOptions}
              value={employeeId}
            />
          </div>
        )}
      </Panel>
      {tab.key === "overview" ? null : tab.key === "matrix" ? (
        <PolicyMatrix employeeId={employeeId} />
      ) : (
        <>
          {resource.error && <ErrorState message={resource.error} />}
          {formFor(tab.key, canManage, employeeId, resource.refresh, resource.data)}
          {resource.loading ? (
            <LoadingState />
          ) : endpoint ? (
            <ResourceTable
              canManage={canManage}
              data={resource.data}
              employeeId={employeeId}
              onChanged={resource.refresh}
              tabKey={tab.key}
            />
          ) : (
            <EmptyState
              body={tText("Select an employee before loading employee-specific payroll data.")}
              title={tText("Employee required")}
            />
          )}
        </>
      )}
    </div>
  );
}

function usePayrollResource(endpoint: string): ResourceState & { refresh: () => void } {
  const [state, setState] = useState<ResourceState>({
    data: null,
    loading: Boolean(endpoint),
    error: "",
  });
  const callIdRef = useRef(0);

  const refresh = useCallback(() => {
    if (!endpoint) {
      setState({ data: null, loading: false, error: "" });
      return;
    }
    callIdRef.current += 1;
    const callId = callIdRef.current;
    setState((current) =>
      current.loading ? current : { ...current, loading: true, error: "" },
    );
    apiClient
      .get(endpoint)
      .then(({ data }) => {
        if (callIdRef.current !== callId) return;
        setState({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (callIdRef.current !== callId) return;
        setState({
          data: null,
          loading: false,
          error: apiError(error),
        });
      });
  }, [endpoint]);

  useEffect(() => {
    refresh();
    return () => {
      callIdRef.current += 1;
    };
  }, [refresh]);

  return useMemo(() => ({ ...state, refresh }), [state, refresh]);
}

function PayrollOverview({
  onOpen,
  permissions,
  visibleTabs,
}: {
  onOpen: (tab: PayrollTabKey) => void;
  permissions: Set<string>;
  visibleTabs: PayrollTab[];
}) {
  const { tText } = useTenantLocalization();
  const settings = usePayrollResource("/payroll/settings");
  const calendars = usePayrollResource("/payroll/calendars");
  const payGroups = usePayrollResource("/payroll/pay-groups");
  const policies = usePayrollResource("/payroll/policies");
  const components = usePayrollResource("/payroll/components");
  const structures = usePayrollResource("/payroll/salary-structures");
  const approvals = usePayrollResource("/payroll/approval-policies");
  const accounting = usePayrollResource("/payroll/accounting-mappings");

  const tabMap = useMemo(
    () => new Map(visibleTabs.map((item) => [item.key, item])),
    [visibleTabs],
  );
  const ready = {
    settings: Boolean(dataObject(settings.data)),
    calendars: rows(calendars.data).some((item) => item.status === "ACTIVE"),
    payGroups: rows(payGroups.data).length > 0,
    policies: rows(policies.data).length > 0,
    components: rows(components.data).length > 0,
    structures: rows(structures.data).length > 0,
    approvals: rows(approvals.data).length > 0,
    accounting: rows(accounting.data).length > 0,
  };
  const setupGroups: Array<{
    accent: string;
    description: string;
    icon: typeof Settings2;
    items: Array<{ key: PayrollTabKey; label: string; ready?: boolean; note?: string }>;
    openKey: PayrollTabKey;
    title: string;
  }> = [
    {
      accent: "theme-tone-icon theme-tone-emerald",
      description: tText("Set the foundation for how payroll works in your company."),
      icon: Settings2,
      items: [
        { key: "settings", label: tText("Company settings"), ready: ready.settings },
        { key: "calendars", label: tText("Pay calendar"), ready: ready.calendars },
        { key: "pay-groups", label: tText("Pay groups"), ready: ready.payGroups },
      ],
      openKey: "settings",
      title: tText("1. Basic setup"),
    },
    {
      accent: "theme-tone-icon theme-tone-violet",
      description: tText("Define what employees are paid and how salary is calculated."),
      icon: WalletCards,
      items: [
        { key: "components", label: tText("Pay items"), ready: ready.components },
        { key: "structures", label: tText("Salary templates"), ready: ready.structures },
        { key: "policies", label: tText("Salary rules"), ready: ready.policies },
      ],
      openKey: "components",
      title: tText("2. Pay setup"),
    },
    {
      accent: "theme-tone-icon theme-tone-amber",
      description: tText("Choose the employee details required before salary can run."),
      icon: UserRound,
      items: [
        { key: "employee-profile", label: tText("Employee payroll fields"), note: tText("Per employee") },
        { key: "payment-details", label: tText("Bank details"), note: tText("Per employee") },
        { key: "statutory-details", label: tText("Government IDs"), note: tText("Per employee") },
      ],
      openKey: "employee-profile",
      title: tText("3. Employee payroll setup"),
    },
    {
      accent: "theme-tone-icon theme-tone-sky",
      description: tText("Set approval steps and connect payroll to finance records."),
      icon: ShieldCheck,
      items: [
        { key: "approval-policies", label: tText("Approval flow"), ready: ready.approvals },
        { key: "accounting", label: tText("Accounting links"), ready: ready.accounting },
        { key: "audit", label: tText("Setup history"), note: tText("View changes") },
      ],
      openKey: "approval-policies",
      title: tText("4. Controls and finance"),
    },
  ];
  const readiness = [
    ready.settings,
    ready.calendars,
    ready.payGroups,
    ready.components,
    ready.structures,
    ready.policies,
    ready.approvals,
    ready.accounting,
  ];
  const readyCount = readiness.filter(Boolean).length;
  const canOpen = (key: PayrollTabKey) => tabMap.has(key);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-5">
        <Panel className="border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="reference-home-hand text-xs font-bold uppercase tracking-[0.18em] text-foreground">
                {tText("Organization setup")}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">
                {tText("Set up in this order")}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {tText("Create payroll rules once. Employee salary work, payslips, and monthly runs stay outside Modules.")}
              </p>
            </div>
            <div className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold theme-tone-text theme-tone-emerald">
              {tText("Setup progress")}: {readyCount} / {readiness.length}
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          {setupGroups.map((group) => {
            const Icon = group.icon;
            const openKey = canOpen(group.openKey)
              ? group.openKey
              : group.items.find((item) => canOpen(item.key))?.key;
            return (
              <Panel className="border-border bg-card p-5" key={group.title}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("grid size-12 shrink-0 place-items-center rounded-full", group.accent)}>
                      <Icon className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{group.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  {openKey && (
                    <button
                      className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                      onClick={() => onOpen(openKey)}
                      type="button"
                    >
                      {tText("Open")}
                    </button>
                  )}
                </div>
                <div className="mt-5 divide-y divide-outline-variant border-t border-outline-variant">
                  {group.items.map((item) => (
                    <button
                      className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm transition hover:text-foreground"
                      disabled={!canOpen(item.key)}
                      key={item.key}
                      onClick={() => onOpen(item.key)}
                      type="button"
                    >
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <CheckCircle2 className="size-4 theme-tone-text theme-tone-emerald" />
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          item.note
                            ? "bg-muted text-muted-foreground"
                            : item.ready
                              ? "status-badge status-enabled"
                              : "status-badge status-pending",
                        )}
                      >
                        {item.note ?? tText(item.ready ? "Ready" : "Needed")}
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>

        <Panel className="border-border bg-card p-5">
          <h3 className="text-base font-bold text-foreground">{tText("Recommended order")}</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              tText("Basic setup"),
              tText("Pay setup"),
              tText("Employee payroll setup"),
              tText("Controls and finance"),
              tText("Ready for payroll runs"),
            ].map((item, index) => (
              <div className="flex items-center gap-3 text-sm font-semibold text-foreground" key={item}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-xs">
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
          {!permissions.has("payroll.protected-data.read") && (
            <p className="mt-4 text-sm text-muted-foreground">
              {tText("Bank details and government IDs are hidden because this user does not have permission to view protected data.")}
            </p>
          )}
        </Panel>
      </div>

      <div className="grid h-fit gap-5">
        <Panel className="border-border bg-card p-5">
          <h3 className="text-base font-bold text-foreground">{tText("What this page is for")}</h3>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {[tText("Company-level payroll setup"), tText("Done once or updated sometimes"), tText("Shared by every payroll run")].map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <CheckCircle2 className="size-4 theme-tone-text theme-tone-emerald" />
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="border-border bg-[#f7fff8] p-5">
          <h3 className="text-base font-bold text-foreground">{tText("Where daily work happens")}</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <a className="flex items-center justify-between text-foreground hover:text-foreground" href="/app/employees">
              {tText("Employee payroll details")} <span aria-hidden="true">→</span>
            </a>
            <a className="flex items-center justify-between text-foreground hover:text-foreground" href="/app/payroll/runs">
              {tText("Monthly salary processing")} <span aria-hidden="true">→</span>
            </a>
            <a className="flex items-center justify-between text-foreground hover:text-foreground" href="/app/reports?type=PAYROLL">
              {tText("Payslips and exports")} <span aria-hidden="true">→</span>
            </a>
          </div>
        </Panel>

        <Panel className="border-border bg-[#fff9ef] p-5">
          <h3 className="text-base font-bold text-foreground">{tText("Need attention")}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {tText("Check employees missing payroll setup before running salary.")}
          </p>
          <a className="mt-4 inline-flex rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted" href="/app/employees">
            {tText("View employees")}
          </a>
        </Panel>
      </div>
    </div>
  );
}

function formFor(
  tabKey: PayrollTabKey,
  canManage: boolean,
  employeeId: string,
  onSaved: () => void,
  data: unknown,
) {
  if (!canManage && tabKey !== "audit") return null;
  const current = dataObject(data);
  if (tabKey === "settings")
    return <SettingsForm current={current} onSaved={onSaved} />;
  if (tabKey === "calendars") return <CalendarForm onSaved={onSaved} />;
  if (tabKey === "pay-groups") return <PayGroupForm onSaved={onSaved} />;
  if (tabKey === "policies") return <PolicyForm onSaved={onSaved} />;
  if (tabKey === "components") return <ComponentForm onSaved={onSaved} />;
  if (tabKey === "structures") return <StructureForm onSaved={onSaved} />;
  if (tabKey === "employee-profile")
    return (
      <EmployeeProfileForm
        current={current}
        employeeId={employeeId}
        onSaved={onSaved}
      />
    );
  if (tabKey === "compensation")
    return <CompensationForm employeeId={employeeId} onSaved={onSaved} />;
  if (tabKey === "payment-details")
    return <PaymentDetailsForm employeeId={employeeId} onSaved={onSaved} />;
  if (tabKey === "statutory-details")
    return <StatutoryDetailsForm employeeId={employeeId} onSaved={onSaved} />;
  if (tabKey === "approval-policies")
    return <ApprovalPolicyForm data={data} onSaved={onSaved} />;
  if (tabKey === "accounting")
    return <AccountingMappingForm onSaved={onSaved} />;
  if (tabKey === "audit") return <AuditFilters />;
  return null;
}

function SettingsForm({
  current,
  onSaved,
}: {
  current: Record<string, unknown> | null;
  onSaved: () => void;
}) {
  const { tText } = useTenantLocalization();
  const settingsId = text(current?.id, "");
  const [form, setForm] = useState<FormState>(() => ({
    countryCode: text(current?.countryCode, "OM"),
    defaultCurrency: text(current?.defaultCurrency, "OMR"),
    locale: text(current?.locale, "en-OM"),
    timezone: text(current?.timezone, "Asia/Muscat"),
    payFrequency: text(current?.payFrequency, "MONTHLY"),
    workingDayBasis: text(current?.workingDayBasis, "CALENDAR_DAYS"),
    effectiveFrom: text(current?.effectiveFrom, today).slice(0, 10),
    version: text(current?.version, "1"),
  }));

  useEffect(() => {
    setForm({
      countryCode: text(current?.countryCode, "OM"),
      defaultCurrency: text(current?.defaultCurrency, "OMR"),
      locale: text(current?.locale, "en-OM"),
      timezone: text(current?.timezone, "Asia/Muscat"),
      payFrequency: text(current?.payFrequency, "MONTHLY"),
      workingDayBasis: text(current?.workingDayBasis, "CALENDAR_DAYS"),
      effectiveFrom: text(current?.effectiveFrom, today).slice(0, 10),
      version: text(current?.version, "1"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsId]);
  const submit = () => {
    const body = {
      countryCode: form.countryCode,
      defaultCurrency: form.defaultCurrency,
      locale: form.locale,
      timezone: form.timezone,
      payFrequency: form.payFrequency,
      workingDayBasis: form.workingDayBasis,
      defaultPayPeriodRule: { type: "calendar-month" },
      defaultPayoutDateRule: { type: "configured-day-after-close", days: 0 },
      defaultProrationPolicy: { schemaVersion: "proration-v1", method: "calendar-days" },
      defaultRoundingPolicy: { schemaVersion: "rounding-v1", mode: "nearest" },
      effectiveFrom: form.effectiveFrom,
      moduleStatus: "ACTIVE",
      ...(current ? { version: Number(form.version) } : {}),
    };
    return save(current ? "patch" : "post", "/payroll/settings", body, onSaved);
  };
  return (
    <FormPanel
      action={tText(current ? "Save settings" : "Create settings")}
      onSubmit={submit}
      title={tText("Payroll settings")}
    >
      <FieldGrid>
        <TextField form={form} name="countryCode" setForm={setForm} />
        <TextField form={form} name="defaultCurrency" setForm={setForm} />
        <TextField form={form} name="locale" setForm={setForm} />
        <TextField form={form} name="timezone" setForm={setForm} />
        <SelectField
          form={form}
          name="payFrequency"
          options={["MONTHLY", "WEEKLY", "BIWEEKLY", "SEMIMONTHLY"]}
          setForm={setForm}
        />
        <TextField form={form} name="workingDayBasis" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
        {current && <TextField form={form} name="version" setForm={setForm} />}
      </FieldGrid>
    </FormPanel>
  );
}

function CalendarForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    code: "MONTHLY_26_25",
    name: "Monthly 26 to 25",
    frequency: "MONTHLY",
    timezone: "Asia/Muscat",
    effectiveFrom: today,
  });
  return (
    <FormPanel
      action={tText("Create calendar")}
      onSubmit={() =>
        save(
          "post",
          "/payroll/calendars",
          {
            ...form,
            periodStartRule: { type: "day-of-month", day: 26, offsetMonth: -1 },
            periodEndRule: { type: "day-of-month", day: 25, offsetMonth: 0 },
            payoutDateRule: { type: "configured-day-after-close", days: 0 },
          },
          onSaved,
        )
      }
      title={tText("Create calendar")}
    >
      <FieldGrid>
        <TextField form={form} name="code" setForm={setForm} />
        <TextField form={form} name="name" setForm={setForm} />
        <SelectField form={form} name="frequency" options={["MONTHLY", "WEEKLY", "BIWEEKLY", "SEMIMONTHLY"]} setForm={setForm} />
        <TextField form={form} name="timezone" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
    </FormPanel>
  );
}

function PayGroupForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const calendars = usePayrollResource("/payroll/calendars");
  const calendarOptions = rows(calendars.data).map((calendar) => ({
    label: `${text(calendar.name, text(calendar.code, tText("Unnamed calendar")))} (${text(calendar.code, "-")})`,
    value: text(calendar.id, ""),
  })).filter((option) => option.value);
  const [form, setForm] = useState<FormState>({
    code: "MONTHLY_OM",
    name: "Monthly Oman",
    currency: "OMR",
    countryCode: "OM",
    effectiveFrom: today,
    calendarId: "",
  });
  return (
    <FormPanel
      action={tText("Create pay group")}
      onSubmit={() => save("post", "/payroll/pay-groups", clean(form), onSaved)}
      title={tText("Create pay group")}
    >
      <FieldGrid>
        <TextField form={form} name="code" setForm={setForm} />
        <TextField form={form} name="name" setForm={setForm} />
        <OptionSelectField
          form={form}
          name="calendarId"
          options={calendarOptions}
          placeholder={
            calendars.loading
              ? tText("Loading calendars")
              : tText("No calendar")
          }
          setForm={setForm}
        />
        <TextField form={form} name="currency" setForm={setForm} />
        <TextField form={form} name="countryCode" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
      {calendars.error && (
        <p className="mt-3 text-sm text-destructive">{calendars.error}</p>
      )}
    </FormPanel>
  );
}

const POLICY_CODES = [
  "PRORATION-DEFAULT",
  "WORKING-DAYS",
  "ROUNDING-STANDARD",
  "OT-DEFAULT",
  "LOP-DEFAULT",
  "JOINER-DEFAULT",
  "LEAVER-DEFAULT",
  "APPROVAL-WORKFLOW",
  "PAYMENT-BANK-TRANSFER",
  "ACCOUNTING-DEFAULT",
];

const METHODS_BY_CATEGORY: Record<string, string[]> = {
  PRORATION: ["calendar-days", "working-days", "fixed-days"],
  WORKING_DAY_BASIS: ["CALENDAR_DAYS", "WORKING_DAYS", "FIXED_DAYS"],
  ROUNDING: ["nearest", "up", "down"],
  OVERTIME_TREATMENT: ["include", "exclude", "pay", "ignore"],
  LOSS_OF_PAY_TREATMENT: ["deduct", "ignore", "prorate"],
  JOINER_TREATMENT: ["prorate", "include", "exclude"],
  LEAVER_TREATMENT: ["prorate", "include", "exclude"],
  APPROVAL_WORKFLOW: ["organization", "pay-group"],
  PAYMENT_CONFIGURATION: ["organization", "pay-group"],
  ACCOUNTING_CONFIGURATION: ["organization"],
};

const SCHEMA_BY_CATEGORY: Record<string, string> = {
  PRORATION: "proration-v1",
  WORKING_DAY_BASIS: "working-day-v1",
  ROUNDING: "rounding-v1",
  OVERTIME_TREATMENT: "overtime-v1",
  LOSS_OF_PAY_TREATMENT: "loss-of-pay-v1",
  JOINER_TREATMENT: "joiner-v1",
  LEAVER_TREATMENT: "leaver-v1",
  APPROVAL_WORKFLOW: "approval-workflow-v1",
  PAYMENT_CONFIGURATION: "payment-configuration-v1",
  ACCOUNTING_CONFIGURATION: "accounting-configuration-v1",
};

function PolicyForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const policies = usePayrollResource("/payroll/policies");
  const [form, setForm] = useState<FormState>({
    code: "PRORATION-DEFAULT",
    name: "Default proration",
    category: "PRORATION",
    method: "calendar-days",
    schemaVersion: "proration-v1",
    effectiveFrom: today,
  });
  const [policyId, setPolicyId] = useState("");
  const config = policyConfig(form);
  const category = String(form.category ?? "");
  const methodOptions = METHODS_BY_CATEGORY[category] ?? [];
  const schemaVersion = SCHEMA_BY_CATEGORY[category] ?? "";
  const policyRows = rows(policies.data);
  const policyOptions = policyRows
    .map((policy) => ({
      label: `${text(policy.name, tText("Unnamed rule"))} (${text(policy.code, "-")})`,
      value: text(policy.id, ""),
    }))
    .filter((option) => option.value);
  return (
    <FormPanel
      action={tText("Create policy")}
      secondary={
        <InlineAction
          action={tText("Create version")}
          disabled={!policyId}
          onClick={() =>
            save(
              "post",
              `/payroll/policies/${policyId}/versions`,
              {
                sourceLevel: "ORGANIZATION",
                supportsOverrides: true,
                config,
                effectiveFrom: form.effectiveFrom,
              },
              onSaved,
            )
          }
        />
      }
      onSubmit={() =>
        save(
          "post",
          "/payroll/policies",
          {
            code: form.code,
            name: form.name,
            category: form.category,
          },
          onSaved,
        )
      }
      title={tText("Policy metadata and typed version")}
    >
      <FieldGrid>
        <SelectField form={form} name="code" options={POLICY_CODES} setForm={setForm} />
        <TextField form={form} name="name" setForm={setForm} />
        <SelectField
          form={form}
          name="category"
          options={[
            "PRORATION",
            "WORKING_DAY_BASIS",
            "ROUNDING",
            "OVERTIME_TREATMENT",
            "LOSS_OF_PAY_TREATMENT",
            "JOINER_TREATMENT",
            "LEAVER_TREATMENT",
            "APPROVAL_WORKFLOW",
            "PAYMENT_CONFIGURATION",
            "ACCOUNTING_CONFIGURATION",
          ]}
          setForm={(update) =>
            setForm((current) => {
              const next =
                typeof update === "function" ? update(current) : update;
              const cat = String(next.category ?? "");
              return {
                ...next,
                method:
                  METHODS_BY_CATEGORY[cat]?.[0] ?? current.method,
                schemaVersion:
                  SCHEMA_BY_CATEGORY[cat] ?? current.schemaVersion,
              };
            })
          }
        />
        <OptionSelectField
          form={{ policyId }}
          hint={tText("Choose an existing salary rule when you want to add a new version.")}
          labelText={tText("Existing salary rule")}
          name="policyId"
          onValueChange={(value) => {
            setPolicyId(value);
            const selected = policyRows.find((policy) => text(policy.id, "") === value);
            if (!selected) return;
            setForm((current) => ({
              ...current,
              category: text(selected.category, current.category ? String(current.category) : "PRORATION"),
              code: text(selected.code, current.code ? String(current.code) : ""),
              name: text(selected.name, current.name ? String(current.name) : ""),
            }));
          }}
          options={policyOptions}
          placeholder={
            policies.loading
              ? tText("Loading salary rules")
              : tText("Select salary rule")
          }
          setForm={() => undefined}
        />
        {methodOptions.length > 0 ? (
          <SelectField
            form={form}
            name="method"
            options={methodOptions}
            setForm={setForm}
          />
        ) : (
          <TextField
            disabled
            form={{ ...form, method: "No methods for this category" }}
            name="method"
            setForm={setForm}
          />
        )}
        <Field label={tText(label("schemaVersion"))}>
          <input
            className={inputClass}
            readOnly
            value={schemaVersion}
          />
        </Field>
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
    </FormPanel>
  );
}

function PolicyMatrix({ employeeId }: { employeeId: string }) {
  const { tText } = useTenantLocalization();
  const employees = usePayrollResource("/employees?limit=100");
  const payGroups = usePayrollResource("/payroll/pay-groups");
  const structures = usePayrollResource("/payroll/salary-structures");
  const [form, setForm] = useState<FormState>({
    employeeId,
    payGroupId: "",
    salaryStructureVersionId: "",
    policyType: "PRORATION",
    effectiveDate: today,
  });
  const endpoint = form.employeeId
    ? `/payroll/policy-matrix/effective?employeeId=${encodeURIComponent(String(form.employeeId))}&policyType=${encodeURIComponent(String(form.policyType))}&effectiveDate=${encodeURIComponent(String(form.effectiveDate))}${form.payGroupId ? `&payGroupId=${encodeURIComponent(String(form.payGroupId))}` : ""}`
    : "";
  const resource = usePayrollResource(endpoint);
  const employeeOptions = rows(employees.data)
    .map((employee) => ({
      label: `${text(employee.fullName, tText("Unnamed employee"))} (${text(employee.employeeCode, "-")})`,
      value: text(employee.id, ""),
    }))
    .filter((option) => option.value);
  const payGroupOptions = rows(payGroups.data)
    .map((payGroup) => ({
      label: `${text(payGroup.name, tText("Unnamed pay group"))} (${text(payGroup.code, "-")})`,
      value: text(payGroup.id, ""),
    }))
    .filter((option) => option.value);
  const salaryTemplateOptions = rows(structures.data)
    .flatMap((structure) => {
      const versions = rows(structure.versions);
      if (versions.length === 0) {
        return [];
      }
      return versions.map((version) => ({
        label: `${text(structure.name, tText("Unnamed salary template"))} v${text(version.version, "-")} (${text(version.status, "-")})`,
        value: text(version.id, ""),
      }));
    })
    .filter((option) => option.value);
  return (
    <div className="grid gap-5">
      <Panel className="p-5">
        <FieldGrid>
          <OptionSelectField
            form={form}
            labelText={tText("Employee")}
            name="employeeId"
            options={employeeOptions}
            placeholder={
              employees.loading
                ? tText("Loading employees")
                : tText("Select employee")
            }
            setForm={setForm}
          />
          <OptionSelectField
            form={form}
            hint={tText("Optional. Use this only when checking a pay-group rule.")}
            labelText={tText("Pay group")}
            name="payGroupId"
            options={payGroupOptions}
            placeholder={
              payGroups.loading
                ? tText("Loading pay groups")
                : tText("No pay group")
            }
            setForm={setForm}
          />
          <OptionSelectField
            disabled
            form={form}
            hint={tText("Shown for context. Rule source is checked by employee, pay group, rule type, and date.")}
            labelText={tText("Salary template")}
            name="salaryStructureVersionId"
            options={salaryTemplateOptions}
            placeholder={
              structures.loading
                ? tText("Loading salary templates")
                : tText("Not used for this check")
            }
            setForm={setForm}
          />
          <SelectField form={form} name="policyType" options={["PRORATION", "WORKING_DAY_BASIS", "ROUNDING", "OVERTIME_TREATMENT", "LOSS_OF_PAY_TREATMENT", "JOINER_TREATMENT", "LEAVER_TREATMENT"]} setForm={setForm} />
          <TextField form={form} name="effectiveDate" setForm={setForm} type="date" />
        </FieldGrid>
      </Panel>
      {(employees.error || payGroups.error || structures.error) && (
        <ErrorState
          message={
            employees.error ??
            payGroups.error ??
            structures.error ??
            tText("Could not load dropdown options.")
          }
        />
      )}
      {resource.error && <ErrorState message={resource.error} />}
      {resource.loading ? <LoadingState /> : <PolicyMatrixResult data={resource.data} />}
    </div>
  );
}

function ComponentForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const components = usePayrollResource("/payroll/components");
  const [form, setForm] = useState<FormState>({
    code: "BASIC",
    name: "Basic salary",
    type: "EARNING",
    componentId: "",
    valueMode: "FIXED",
    taxable: true,
    statutory: false,
    recurring: true,
    calculationOrder: "100",
    currencyBehavior: "EMPLOYEE_CURRENCY",
    effectiveFrom: today,
  });
  const componentOptions = rows(components.data).map((component) => ({
    label: `${text(component.name, text(component.code, tText("Unnamed component")))} (${text(component.code, "-")})`,
    value: text(component.id, ""),
  })).filter((option) => option.value);
  const selectedComponent = rows(components.data).find(
    (component) => text(component.id, "") === form.componentId,
  );
  const selectedComponentName = selectedComponent
    ? `${text(selectedComponent.name, text(selectedComponent.code, tText("Unnamed component")))} (${text(selectedComponent.code, "-")})`
    : "";
  const existingComponent = rows(components.data).find(
    (component) =>
      text(component.code, "").toUpperCase() ===
      String(form.code ?? "").trim().toUpperCase(),
  );
  const versionPayload = {
    valueMode: form.valueMode,
    taxable: Boolean(form.taxable),
    statutory: Boolean(form.statutory),
    recurring: Boolean(form.recurring),
    calculationOrder: Number(form.calculationOrder),
    currencyBehavior: form.currencyBehavior,
    roundingBehavior: { mode: "nearest" },
    config: { schemaVersion: "component-v1", formulaReference: "" },
    effectiveFrom: form.effectiveFrom,
  };
  const latestDraftComponentVersion = rows(components.data)
    .map((component) => {
      const version = rows(component.versions).find(
        (item) => text(item.status, "") === "DRAFT",
      );
      return {
        componentId: text(component.id, ""),
        versionId: text(version?.id, ""),
      };
    })
    .find((item) => item.componentId && item.versionId);
  return (
    <FormPanel
      action={tText(form.componentId ? "Save rules for selected pay line" : "Create pay line")}
      description={tText("A pay line is one row in salary, like Basic salary, Housing allowance, or Loan deduction. Create the pay line, then make it ready so it can be used inside a salary template.")}
      secondary={
        <>
          <InlineAction
            action={tText("Add rules to selected pay line")}
            disabled={!form.componentId}
            disabledReason={tText("Only use this when you are editing an existing pay line.")}
            onClick={() =>
              save(
                "post",
                `/payroll/components/${form.componentId}/versions`,
                versionPayload,
                () => {
                  components.refresh();
                  onSaved();
                },
              )
            }
          />
          {latestDraftComponentVersion ? (
            <InlineAction
              action={tText("Make pay line ready")}
              onClick={async () => {
                await apiClient.post(
                  `/payroll/components/${latestDraftComponentVersion.componentId}/versions/${latestDraftComponentVersion.versionId}/activate`,
                );
                components.refresh();
                onSaved();
              }}
            />
          ) : null}
        </>
      }
      onSubmit={async () => {
        let componentId = text(selectedComponent?.id, "") || text(existingComponent?.id, "");
        if (!componentId) {
          const created = await apiClient.post("/payroll/components", {
            code: form.code,
            name: form.name,
            type: form.type,
          });
          componentId = text(dataObject(created.data)?.id, "");
        }
        if (componentId) {
          await apiClient.post(
            `/payroll/components/${componentId}/versions`,
            versionPayload,
          );
          setForm((current) => ({ ...current, componentId }));
        }
        components.refresh();
        onSaved();
      }}
      title={tText("Pay line setup")}
    >
      <SetupHint>
        {tText("Start simple: create BASIC as Basic salary. Type = Earning, Amount type = Fixed, keep Recurring checked, calculation order = 100. After saving, click Make pay line ready.")}
      </SetupHint>
      {selectedComponentName ? (
        <p className="mb-3 text-sm text-zinc-600">
          {tText("You are adding rules to")}: <span className="font-medium text-zinc-900">{selectedComponentName}</span>
        </p>
      ) : null}
      <FieldGrid>
        <OptionSelectField
          form={form}
          hint={tText("Leave this empty to create a new pay line. Select one only to add new rules to it.")}
          labelText={tText("Existing pay line")}
          name="componentId"
          onValueChange={(componentId) => {
            const component = rows(components.data).find(
              (item) => text(item.id, "") === componentId,
            );
            setForm((current) => ({
              ...current,
              code: componentId ? text(component?.code, String(current.code ?? "")) : current.code,
              name: componentId ? text(component?.name, String(current.name ?? "")) : current.name,
              type: componentId ? text(component?.type, String(current.type ?? "")) : current.type,
            }));
          }}
          options={componentOptions}
          placeholder={components.loading ? tText("Loading pay lines") : tText("Create new pay line")}
          setForm={setForm}
        />
        <TextField disabled={Boolean(form.componentId)} form={form} hint={tText("Short uppercase code, minimum 2 characters. Example: BASIC, HRA, LOAN.")} name="code" setForm={setForm} />
        <TextField disabled={Boolean(form.componentId)} form={form} hint={tText("Name shown on salary setup and payslips.")} name="name" setForm={setForm} />
        <SelectField disabled={Boolean(form.componentId)} form={form} name="type" options={["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "REIMBURSEMENT", "INFORMATIONAL"]} setForm={setForm} />
        <SelectField form={form} name="valueMode" options={["FIXED", "FORMULA_REFERENCE"]} setForm={setForm} />
        <TextField form={form} name="calculationOrder" setForm={setForm} />
        <CheckboxField form={form} name="taxable" setForm={setForm} />
        <CheckboxField form={form} name="statutory" setForm={setForm} />
        <CheckboxField form={form} name="recurring" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
      {components.error && (
        <p className="mt-3 text-sm text-destructive">{components.error}</p>
      )}
    </FormPanel>
  );
}

function StructureForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const structures = usePayrollResource("/payroll/salary-structures");
  const components = usePayrollResource("/payroll/components");
  const [mode, setMode] = useState<"choose" | "create" | "edit">("choose");
  const [form, setForm] = useState<FormState>({
    code: "OM_MONTHLY",
    name: "Oman monthly salary",
    currency: "OMR",
    structureId: "",
    versionId: "",
    effectiveFrom: today,
  });
  const [selectedPayLineIds, setSelectedPayLineIds] = useState<string[]>([]);
  const [payLineRules, setPayLineRules] = useState<Record<string, PayLineRule>>(
    {},
  );
  const [reorderingPayLines, setReorderingPayLines] = useState(false);
  const structureOptions = rows(structures.data).map((structure) => ({
    label: `${text(structure.name, text(structure.code, tText("Unnamed structure")))} (${text(structure.code, "-")})`,
    value: text(structure.id, ""),
  })).filter((option) => option.value);
  const activeComponentOptions = rows(components.data).flatMap((component) =>
    rows(component.versions).filter((version) => text(version.status, "") === "ACTIVE").map((version) => ({
      label: `${text(component.name, text(component.code, tText("Component")))} (${text(component.code, "-")}) v${text(version.version, "1")}`,
      value: text(version.id, ""),
    })),
  ).filter((option) => option.value);
  const draftStructureOptions = salaryStructureVersionOptions(rows(structures.data), String(form.structureId ?? ""), tText)
    .filter((option) => option.status === "DRAFT");
  const inferredEditableSetupId = String(form.versionId || draftStructureOptions[0]?.value || "");
  const selectedStructure = rows(structures.data).find(
    (structure) => text(structure.id, "") === form.structureId,
  );
  const selectedEditableSetup = rows(selectedStructure?.versions).find(
    (version) => text(version.id, "") === inferredEditableSetupId,
  );
  const activeComponentLabelByVersionId = new Map(
    activeComponentOptions.map((option) => [option.value, option.label]),
  );
  const addedPayLineIds = new Set(
    rows(selectedEditableSetup?.components)
      .map((item) =>
        text(item.payComponentVersionId, "") ||
        text(dataObject(item.componentVersion)?.id, ""),
      )
      .filter(Boolean),
  );
  const addedPayLines: AddedPayLine[] = rows(selectedEditableSetup?.components)
    .sort(
      (a, b) =>
        Number(text(a.calculationOrder, "0")) -
        Number(text(b.calculationOrder, "0")),
    )
    .map((item): AddedPayLine | null => {
      const componentVersionId =
        text(item.payComponentVersionId, "") ||
        text(dataObject(item.componentVersion)?.id, "");
      const optionLabel = activeComponentLabelByVersionId.get(componentVersionId);
      const version = dataObject(item.componentVersion);
      const component = dataObject(version?.component);
      const code = text(component?.code, text(item.code, ""));
      const name = text(component?.name, text(item.name, code));
      const labelValue =
        optionLabel ||
        (name || code ? `${name}${code ? ` (${code})` : ""}` : "");
      if (!componentVersionId || !labelValue) return null;
      return {
        amountLabel: payLineAmountLabel(item, tText),
        componentVersionId,
        fixedAmountMinor: text(item.fixedAmountMinor, ""),
        formulaReference: text(item.formulaReference, ""),
        label: labelValue,
        percentageBasisPoints: text(item.percentageBasisPoints, ""),
        required: item.required !== false,
      };
    })
    .filter((item): item is AddedPayLine => Boolean(item));
  const existingPercentageTotal = rows(selectedEditableSetup?.components).reduce(
    (total, item) =>
      total + Number(text(item.percentageBasisPoints, "0")) / 100,
    0,
  );
  const selectedPercentageTotal = selectedPayLineIds.reduce((total, id) => {
    const rule = payLineRules[id];
    if (rule?.amountType !== "percentage") return total;
    return total + Number(rule.percentage || 0);
  }, 0);
  const remainingPercentage = Math.max(
    0,
    100 - existingPercentageTotal - selectedPercentageTotal,
  );
  const invalidSelectedPayLine =
    existingPercentageTotal + selectedPercentageTotal > 100 ||
    selectedPayLineIds.some((id) => payLineRuleInvalid(payLineRules[id]));
  function selectPayLines(nextIds: string[]) {
    setSelectedPayLineIds(nextIds);
    setPayLineRules((current) => {
      const next: Record<string, PayLineRule> = {};
      const previousSelectedTotal = selectedPayLineIds.reduce((total, id) => {
        const rule = current[id];
        if (rule?.amountType !== "percentage") return total;
        return total + Number(rule.percentage || 0);
      }, 0);
      const previousRemaining = Math.max(
        0,
        100 - existingPercentageTotal - previousSelectedTotal,
      );
      let newLineUsedRemaining = false;
      nextIds.forEach((id, index) => {
        if (current[id]) {
          next[id] = current[id];
          return;
        }
        const suggestedPercentage = newLineUsedRemaining
          ? "0"
          : formatPercentageInput(previousRemaining);
        newLineUsedRemaining = true;
        next[id] = {
          amountType: "percentage",
          fixedAmountMinor: "0",
          formulaReference: "",
          percentage: suggestedPercentage,
        };
      });
      return next;
    });
  }
  function updatePayLineRule(id: string, updates: Partial<PayLineRule>) {
    setPayLineRules((current) => ({
      ...current,
      [id]: {
        ...defaultPayLineRule(),
        ...current[id],
        ...updates,
      },
    }));
  }
  async function saveAddedPayLineOrder(nextPayLines: AddedPayLine[]) {
    if (!inferredEditableSetupId) return;
    setReorderingPayLines(true);
    try {
      for (const payLine of addedPayLines) {
        await apiClient.delete(
          `/payroll/salary-structures/versions/${inferredEditableSetupId}/components/${payLine.componentVersionId}`,
        );
      }
      for (const [index, payLine] of nextPayLines.entries()) {
        await apiClient.post(
          `/payroll/salary-structures/versions/${inferredEditableSetupId}/components`,
          clean({
            payComponentVersionId: payLine.componentVersionId,
            fixedAmountMinor: payLine.fixedAmountMinor,
            percentageBasisPoints: payLine.percentageBasisPoints,
            formulaReference: payLine.formulaReference,
            calculationOrder: (index + 1) * 100,
            required: payLine.required,
          }),
        );
      }
      structures.refresh();
      onSaved();
    } finally {
      setReorderingPayLines(false);
    }
  }
  const availablePayLineOptions = activeComponentOptions.filter(
    (option) => !addedPayLineIds.has(option.value),
  );
  const existingStructureByCode = rows(structures.data).find(
    (structure) =>
      text(structure.code, "").toUpperCase() ===
      String(form.code ?? "").trim().toUpperCase(),
  );
  const existingStructureIdByCode = text(existingStructureByCode?.id, "");
  const selectExistingStructure = () => {
    if (!existingStructureIdByCode) return;
    const editableSetup = salaryStructureVersionOptions(
      rows(structures.data),
      existingStructureIdByCode,
      tText,
    ).find((option) => option.status === "DRAFT");
    setForm((current) => ({
      ...current,
      structureId: existingStructureIdByCode,
      versionId: editableSetup?.value ?? "",
    }));
    setSelectedPayLineIds([]);
    setPayLineRules({});
    setMode("edit");
  };
  const selectedEditableStructureId =
    text(selectedStructure?.id, "") || text(existingStructureByCode?.id, "");
  const canEditTemplate = Boolean(selectedEditableStructureId);
  const canMakeReady = Boolean(
    selectedEditableStructureId &&
    inferredEditableSetupId &&
    addedPayLines.length,
  );
  const hasNoMorePayLinesToAdd = Boolean(
    inferredEditableSetupId &&
    activeComponentOptions.length &&
    !availablePayLineOptions.length,
  );
  return (
    <FormPanel
      action={tText("Create salary template")}
      description={tText("A salary template is the group of pay lines used for employees, for example Basic salary plus allowances. Create a template, add ready pay lines, then make the template ready for employees.")}
      secondary={
        canEditTemplate ? (
          <>
          {!inferredEditableSetupId ? (
            <InlineAction
              action={tText("Start editing selected template")}
              disabled={!form.structureId}
              disabledReason={tText("Select an existing salary template first.")}
              onClick={() =>
                save(
                  "post",
                  `/payroll/salary-structures/${form.structureId}/versions`,
                  { effectiveFrom: form.effectiveFrom },
                  () => {
                    structures.refresh();
                    onSaved();
                  },
                )
              }
            />
          ) : null}
          <InlineAction
            action={tText("Add selected pay lines")}
            disabled={
              !inferredEditableSetupId ||
              !selectedPayLineIds.length ||
              invalidSelectedPayLine ||
              hasNoMorePayLinesToAdd
            }
            disabledReason={
              !activeComponentOptions.length
                ? tText("Go to Components and make at least one pay line ready first.")
                : !inferredEditableSetupId
                  ? tText("Click Start editing selected template first.")
                  : hasNoMorePayLinesToAdd
                    ? tText("All ready pay lines are already in this salary template.")
                    : invalidSelectedPayLine
                      ? tText("Complete the amount type and value for each selected pay line.")
                  : tText("Select one or more ready pay lines first.")
            }
            onClick={async () => {
              const payLineIdsToAdd = selectedPayLineIds.filter(
                (payLineId) => !addedPayLineIds.has(payLineId),
              );
              for (const [index, payComponentVersionId] of payLineIdsToAdd.entries()) {
                const rule =
                  payLineRules[payComponentVersionId] ??
                  defaultPayLineRule();
                await apiClient.post(
                  `/payroll/salary-structures/versions/${inferredEditableSetupId}/components`,
                  clean({
                    payComponentVersionId,
                    fixedAmountMinor:
                      rule.amountType === "fixed"
                        ? rule.fixedAmountMinor || "0"
                        : "",
                    percentageBasisPoints:
                      rule.amountType === "percentage"
                        ? String(percentageToBasisPoints(rule.percentage))
                        : "",
                    formulaReference:
                      rule.amountType === "formula" ? rule.formulaReference : "",
                    calculationOrder:
                      (addedPayLines.length + index + 1) * 100,
                    required: true,
                  }),
                );
              }
              setSelectedPayLineIds([]);
              setPayLineRules({});
              structures.refresh();
              onSaved();
            }}
          />
          {canMakeReady ? (
            <InlineAction
              action={tText("Make template ready")}
              onClick={async () => {
                await apiClient.post(
                  `/payroll/salary-structures/${selectedEditableStructureId}/versions/${inferredEditableSetupId}/activate`,
                );
                structures.refresh();
                onSaved();
              }}
            />
          ) : null}
          </>
        ) : null
      }
      hidePrimary={mode === "choose" || mode === "edit"}
      onSubmit={async () => {
        if (existingStructureByCode) {
          selectExistingStructure();
          return;
        }
        const created = await apiClient.post(
          "/payroll/salary-structures",
          { code: form.code, name: form.name, currency: form.currency },
        );
        const structureId = text(dataObject(created.data)?.id, "");
        if (structureId) {
          const createdVersion = await apiClient.post(
            `/payroll/salary-structures/${structureId}/versions`,
            { effectiveFrom: form.effectiveFrom },
          );
              setForm((current) => ({
                ...current,
                structureId,
                versionId: text(dataObject(createdVersion.data)?.id, ""),
              }));
              setSelectedPayLineIds([]);
              setPayLineRules({});
              setMode("edit");
            }
        structures.refresh();
        onSaved();
      }}
      title={tText("Salary template setup")}
    >
      <SetupHint>
        {mode === "choose"
          ? tText("Step 1: choose whether you want to create a new salary template or use one that already exists.")
          : mode === "create"
            ? tText("Step 1: create the salary template only. You will add pay lines after it is created.")
            : tText("Step 2: add one or more ready pay lines to this salary template. When the list is correct, make the template ready.")}
      </SetupHint>
      {mode === "choose" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <button
            className="rounded-lg border border-zinc-300 p-4 text-left hover:bg-zinc-50"
            onClick={() => setMode("create")}
            type="button"
          >
            <span className="block text-sm font-semibold text-zinc-900">
              {tText("Create new salary template")}
            </span>
            <span className="mt-1 block text-sm leading-6 text-zinc-600">
              {tText("Use this for a new salary design, such as Google monthly salary.")}
            </span>
          </button>
          <button
            className="rounded-lg border border-zinc-300 p-4 text-left hover:bg-zinc-50"
            onClick={() => setMode("edit")}
            type="button"
          >
            <span className="block text-sm font-semibold text-zinc-900">
              {tText("Use existing salary template")}
            </span>
            <span className="mt-1 block text-sm leading-6 text-zinc-600">
              {tText("Use this when the template is already created and you want to add pay lines.")}
            </span>
          </button>
        </div>
      ) : null}
      {mode === "create" ? (
        <>
          <FieldGrid>
            <TextField form={form} hint={tText("Short uppercase code, for example GOOGLE_MONTHLY.")} name="code" setForm={setForm} />
            <TextField form={form} hint={tText("Template name shown when assigning salary.")} name="name" setForm={setForm} />
            <TextField form={form} hint={tText("Payroll currency for this template.")} name="currency" setForm={setForm} />
            <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
          </FieldGrid>
          {existingStructureByCode ? (
            <div className="mt-4 rounded-lg border theme-tone theme-tone-amber p-4">
              <p className="text-sm font-semibold theme-tone-text theme-tone-amber">
                {tText("This salary template already exists")}
              </p>
              <p className="mt-1 text-sm leading-6 theme-tone-text theme-tone-amber">
                {tText("Use the existing salary template instead of creating another one with the same code.")}
              </p>
              <button
                className="mt-3 inline-flex min-h-10 items-center rounded-lg theme-button-primary px-4 text-sm font-semibold shadow-sm"
                onClick={selectExistingStructure}
                type="button"
              >
                {tText("Use existing salary template")}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {mode === "edit" ? (
        <>
          <FieldGrid>
            <OptionSelectField
              form={form}
              hint={tText("Choose the template you want to add pay lines into.")}
              labelText={tText("Salary template")}
              name="structureId"
              onValueChange={(structureId) => {
                const editableSetup = salaryStructureVersionOptions(
                  rows(structures.data),
                  structureId,
                  tText,
                ).find((option) => option.status === "DRAFT");
                setForm((current) => ({
                  ...current,
                  versionId: editableSetup?.value ?? "",
                }));
                setSelectedPayLineIds([]);
                setPayLineRules({});
              }}
              options={structureOptions}
              placeholder={structures.loading ? tText("Loading structures") : tText("Select salary template")}
              setForm={setForm}
            />
          </FieldGrid>
          <PayLineChecklist
            addedPayLines={addedPayLines}
            disabled={!inferredEditableSetupId}
            existingPercentageTotal={existingPercentageTotal}
            loading={components.loading}
            onChange={selectPayLines}
            onReorderAdded={(nextPayLines) => void saveAddedPayLineOrder(nextPayLines)}
            onRuleChange={updatePayLineRule}
            options={availablePayLineOptions}
            reordering={reorderingPayLines}
            remainingPercentage={remainingPercentage}
            rules={payLineRules}
            selected={selectedPayLineIds}
            selectedPercentageTotal={selectedPercentageTotal}
          />
          {!inferredEditableSetupId && form.structureId ? (
            <p className="mt-3 text-sm theme-tone-text theme-tone-amber">
              {tText("Click Start editing selected template before adding pay lines.")}
            </p>
          ) : null}
          {canMakeReady ? (
            <div className="mt-4 rounded-lg border theme-tone theme-tone-amber p-4">
              <p className="text-sm font-semibold theme-tone-text theme-tone-amber">
                {tText("Next step: make this salary template ready")}
              </p>
              <p className="mt-1 text-sm leading-6 theme-tone-text theme-tone-amber">
                {tText("Employees cannot use this template in Compensation until you click Make template ready.")}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
      {!activeComponentOptions.length && (
        <p className="mt-3 text-sm theme-tone-text theme-tone-amber">
          {tText("No ready pay lines yet. Go to Components, create BASIC, then click Make pay line ready.")}
        </p>
      )}
      {structures.error && (
        <p className="mt-3 text-sm text-destructive">{structures.error}</p>
      )}
      {components.error && (
        <p className="mt-3 text-sm text-destructive">{components.error}</p>
      )}
    </FormPanel>
  );
}

function EmployeeProfileForm({ current, employeeId, onSaved }: { current: Record<string, unknown> | null; employeeId: string; onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const payGroups = usePayrollResource("/payroll/pay-groups");
  const payGroupOptions = rows(payGroups.data).map((payGroup) => ({
    label: `${text(payGroup.name, text(payGroup.code, tText("Unnamed pay group")))} (${text(payGroup.code, "-")})`,
    value: text(payGroup.id, ""),
  })).filter((option) => option.value);

  const profileId = text(current?.id, "");
  const [form, setForm] = useState<FormState>(() => ({
    payGroupId: text(current?.payGroupId, ""),
    payrollCountry: text(current?.payrollCountry, "OM"),
    payrollStatus: text(current?.payrollStatus, "ACTIVE"),
    paymentMethod: text(current?.paymentMethod, "BANK_TRANSFER"),
    salaryHold: Boolean(current?.salaryHold),
    effectiveFrom: text(current?.effectiveFrom, today).slice(0, 10),
    version: text(current?.version, "1"),
  }));

  useEffect(() => {
    setForm({
      payGroupId: text(current?.payGroupId, ""),
      payrollCountry: text(current?.payrollCountry, "OM"),
      payrollStatus: text(current?.payrollStatus, "ACTIVE"),
      paymentMethod: text(current?.paymentMethod, "BANK_TRANSFER"),
      salaryHold: Boolean(current?.salaryHold),
      effectiveFrom: text(current?.effectiveFrom, today).slice(0, 10),
      version: text(current?.version, "1"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, employeeId]);

  if (!employeeId) return null;
  return (
    <FormPanel
      action={tText(current ? "Save profile" : "Create profile")}
      description={tText("The employee profile enrolls one employee into payroll and connects them to a pay group. Without this, compensation and payroll runs cannot treat the person as a payroll employee.")}
      submitDisabled={!form.payGroupId}
      submitDisabledReason={tText("Select a pay group first.")}
      onSubmit={() =>
        save(
          current ? "patch" : "post",
          `/payroll/employees/${employeeId}/profile`,
          {
            payGroupId: emptyToUndefined(form.payGroupId),
            payrollCountry: form.payrollCountry,
            payrollStatus: form.payrollStatus,
            paymentMethod: form.paymentMethod,
            salaryHold: Boolean(form.salaryHold),
            effectiveFrom: form.effectiveFrom,
            ...(current ? { version: Number(form.version) } : {}),
          },
          onSaved,
        )
      }
      title={tText("Employee payroll profile")}
    >
      <SetupHint>
        {tText("For normal employees: choose the pay group, keep status Active, choose Bank transfer or Cash, and leave Salary hold unchecked. Salary hold means do not pay this employee yet.")}
      </SetupHint>
      <FieldGrid>
        <OptionSelectField
          form={form}
          hint={tText("This decides the employee payroll calendar, currency, country, and policy defaults.")}
          labelText={tText("Pay group")}
          name="payGroupId"
          options={payGroupOptions}
          placeholder={payGroups.loading ? tText("Loading pay groups") : tText("Select pay group")}
          setForm={setForm}
        />
        <TextField form={form} name="payrollCountry" setForm={setForm} />
        <SelectField form={form} name="payrollStatus" options={["ACTIVE", "ON_HOLD", "STOPPED"]} setForm={setForm} />
        <SelectField form={form} name="paymentMethod" options={["BANK_TRANSFER", "CASH", "CHEQUE"]} setForm={setForm} />
        <CheckboxField form={form} name="salaryHold" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
        {current && <TextField form={form} name="version" setForm={setForm} />}
      </FieldGrid>
      {payGroups.error && (
        <p className="mt-3 text-sm text-destructive">{payGroups.error}</p>
      )}
    </FormPanel>
  );
}

function CompensationForm({ employeeId, onSaved }: { employeeId: string; onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const structures = usePayrollResource("/payroll/salary-structures");
  const structureVersionOptions = rows(structures.data).flatMap((structure) =>
    rows(structure.versions)
      .filter((version) => text(version.status, "") === "ACTIVE")
      .map((version) => ({
        label: `${text(structure.name, text(structure.code, tText("Salary structure")))} (${text(structure.code, "-")}) v${text(version.version, "1")} - ${text(version.status, "ACTIVE")}`,
        value: text(version.id, ""),
      })),
  ).filter((option) => option.value);
  const activatableStructureVersion = rows(structures.data)
    .map((structure) => {
      const version = rows(structure.versions).find(
        (item) => text(item.status, "") === "DRAFT",
      );
      return {
        structureId: text(structure.id, ""),
        versionId: text(version?.id, ""),
      };
    })
    .find((item) => item.structureId && item.versionId);
  const [form, setForm] = useState<FormState>({
    salaryStructureVersionId: "",
    currency: "OMR",
    amount: "0.000",
    effectiveFrom: today,
    reason: "Payroll compensation revision",
  });
  if (!employeeId) return null;
  return (
    <FormPanel
      action={tText("Create compensation revision")}
      description={tText("Compensation is the employee's actual salary amount. It must reference an active salary structure version, because payroll needs to know which components make up the salary.")}
      secondary={
        !structureVersionOptions.length && activatableStructureVersion ? (
          <InlineAction
            action={tText("Activate latest structure")}
            onClick={async () => {
              await apiClient.post(
                `/payroll/salary-structures/${activatableStructureVersion.structureId}/versions/${activatableStructureVersion.versionId}/activate`,
              );
              structures.refresh();
              onSaved();
            }}
          />
        ) : null
      }
      submitDisabled={!form.salaryStructureVersionId}
      submitDisabledReason={tText("Select an active salary structure version first.")}
      onSubmit={() =>
        save(
          "post",
          `/payroll/employees/${employeeId}/compensation`,
          {
            salaryStructureVersionId: form.salaryStructureVersionId,
            baseAmountMinor: decimalToMinor(String(form.amount), String(form.currency)),
            currency: form.currency,
            effectiveFrom: form.effectiveFrom,
            reason: form.reason,
          },
          onSaved,
        )
      }
      title={tText("Compensation revision")}
    >
      <SetupHint>
        {tText("Example: select Oman monthly salary v1 ACTIVE, currency OMR, amount 650.000. This amount is the employee's monthly salary for that structure.")}
      </SetupHint>
      <FieldGrid>
        <OptionSelectField
          form={form}
          hint={tText("Only active structure versions are shown here. Drafts cannot be assigned to employees.")}
          labelText={tText("Salary structure version")}
          name="salaryStructureVersionId"
          options={structureVersionOptions}
          placeholder={structures.loading ? tText("Loading salary structures") : tText("Select salary structure version")}
          setForm={setForm}
        />
        <TextField form={form} name="currency" setForm={setForm} />
        <TextField form={form} hint={tText("Enter normal currency amount, for example 650.000 OMR.")} name="amount" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
        <TextField form={form} name="reason" setForm={setForm} />
      </FieldGrid>
      {!form.salaryStructureVersionId && (
        <p className="mt-3 text-sm theme-tone-text theme-tone-amber">
          {structureVersionOptions.length
            ? tText("Select a salary structure version before creating compensation.")
            : tText("Activate a salary structure version before creating compensation.")}
        </p>
      )}
      {structures.error && (
        <p className="mt-3 text-sm text-destructive">{structures.error}</p>
      )}
    </FormPanel>
  );
}

function PaymentDetailsForm({ employeeId, onSaved }: { employeeId: string; onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    paymentMethod: "BANK_TRANSFER",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    iban: "",
    routingNumber: "",
    swiftBic: "",
  });
  if (!employeeId) return null;
  return (
    <FormPanel
      action={tText("Save protected payment details")}
      confirm={tText("Replace protected payment details? Stored plaintext will not be displayed after submission.")}
      description={tText("Payment details tell payroll how to pay this employee. Bank fields are protected, so after saving the system only shows masked values.")}
      onSubmit={() =>
        save("post", `/payroll/employees/${employeeId}/payment-details`, clean(form), () => {
          setForm((current) => ({
            ...current,
            accountNumber: "",
            iban: "",
            routingNumber: "",
          }));
          onSaved();
        })
      }
      title={tText("Protected payment details")}
    >
      <SetupHint>
        {tText("For cash salary, choose Cash and leave bank fields empty. For bank transfer, enter bank name, account holder, account number or IBAN, and SWIFT/BIC if used.")}
      </SetupHint>
      <FieldGrid>
        <SelectField form={form} name="paymentMethod" options={["BANK_TRANSFER", "CASH", "CHEQUE"]} setForm={setForm} />
        <TextField form={form} name="bankName" setForm={setForm} />
        <TextField form={form} name="accountHolderName" setForm={setForm} />
        <TextField form={form} name="accountNumber" setForm={setForm} />
        <TextField form={form} name="iban" setForm={setForm} />
        <TextField form={form} name="routingNumber" setForm={setForm} />
        <TextField form={form} name="swiftBic" setForm={setForm} />
      </FieldGrid>
    </FormPanel>
  );
}

function StatutoryDetailsForm({ employeeId, onSaved }: { employeeId: string; onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    countryCode: "OM",
    identifierType: "NATIONAL_ID",
    identifier: "",
  });
  if (!employeeId) return null;
  return (
    <FormPanel
      action={tText("Save protected statutory detail")}
      confirm={tText("Replace protected statutory detail? Stored plaintext will not be displayed after submission.")}
      onSubmit={() =>
        save("post", `/payroll/employees/${employeeId}/statutory-details`, clean(form), () => {
          setForm((current) => ({ ...current, identifier: "" }));
          onSaved();
        })
      }
      title={tText("Protected statutory details")}
    >
      <FieldGrid>
        <SelectField
          form={form}
          name="countryCode"
          options={["OM", "IN", "AE", "SA", "QA", "KW", "BH"]}
          setForm={setForm}
        />
        <SelectField
          form={form}
          name="identifierType"
          options={["CIVIL_ID", "NATIONAL_ID", "PASSPORT", "RESIDENCE_PERMIT", "LABOR_CARD"]}
          setForm={setForm}
        />
        <Field hint={tText("The actual ID number (e.g. 87654321 or A1234567)")} label={tText(label("identifier"))}>
          <input
            className={inputClass}
            onChange={(event) =>
              setForm((current) => ({ ...current, identifier: event.target.value }))
            }
            value={String(form.identifier ?? "")}
          />
        </Field>
      </FieldGrid>
    </FormPanel>
  );
}

function ApprovalPolicyForm({ data, onSaved }: { data: unknown; onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const existingList = rows(data);
  const existing = existingList[0] ?? null;
  const existingId = text(existing?.id, "");
  const activeVersion = existing
    ? rows(existing.versions).find((v) => text(v.status, "") === "ACTIVE")
    : null;

  const [form, setForm] = useState<FormState>({
    fourEyesEnabled: activeVersion ? Boolean(activeVersion.fourEyesEnabled) : true,
    makerCanApprove: activeVersion ? Boolean(activeVersion.makerCanApprove) : false,
    requiredLevels: text(activeVersion?.requiredLevels, "2"),
    allowedPermissions: activeVersion
      ? (Array.isArray(activeVersion.allowedPermissions)
        ? activeVersion.allowedPermissions.join(",")
        : String(activeVersion.allowedPermissions ?? "payroll.runs.approve"))
      : "payroll.runs.approve",
    allowedRoleKeys: activeVersion
      ? (Array.isArray(activeVersion.allowedRoleKeys)
        ? activeVersion.allowedRoleKeys.join(",")
        : String(activeVersion.allowedRoleKeys ?? "HR_ADMIN,BUSINESS_ADMIN"))
      : "HR_ADMIN,BUSINESS_ADMIN",
    effectiveFrom: today,
  });

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(text(existing?.name, ""));

  if (!existing) {
    return (
      <FormPanel
        action={tText("Create approval policy")}
        onSubmit={() =>
          save("post", "/payroll/approval-policies", { name: "Payroll approval" }, onSaved)
        }
        title={tText("Approval policy")}
      >
        <p className="text-sm theme-tone-text theme-tone-amber">
          {tText("No approval policy exists. Create one to define who can approve payroll runs.")}
        </p>
      </FormPanel>
    );
  }

  const activePerms = activeVersion?.allowedPermissions;
  const activeRoleKeys = activeVersion?.allowedRoleKeys;

  return (
    <div className="grid gap-5">
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                className={inputClass}
                onChange={(e) => setNameDraft(e.target.value)}
                value={nameDraft}
              />
              <button
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-white"
                onClick={async () => {
                  setEditingName(false);
                  await apiClient.patch(
                    `/payroll/approval-policies/${existingId}`,
                    { name: nameDraft, version: Number(text(existing.version, "1")) },
                  );
                  onSaved();
                }}
                type="button"
              >
                {tText("Save")}
              </button>
              <button
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                onClick={() => {
                  setEditingName(false);
                  setNameDraft(text(existing.name, ""));
                }}
                type="button"
              >
                {tText("Cancel")}
              </button>
            </div>
          ) : (
            <h3 className="text-base font-semibold text-zinc-900">
              {text(existing.name, tText("Approval policy"))}
            </h3>
          )}
          {!editingName && (
            <button
              className="text-xs text-zinc-400 hover:text-zinc-600"
              onClick={() => setEditingName(true)}
              type="button"
            >
              {tText("Rename")}
            </button>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {tText("Current configuration. Create a new version to change these rules.")}
        </p>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex gap-2">
            <span className="text-zinc-500">{tText("Four eyes")}:</span>
            <span className="font-medium">
              {activeVersion?.fourEyesEnabled
                ? tText("Enabled — different user must approve")
                : tText("Disabled")}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-500">{tText("Maker can approve")}:</span>
            <span className="font-medium">
              {activeVersion?.makerCanApprove ? tText("Yes") : tText("No")}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-500">{tText("Required levels")}:</span>
            <span className="font-medium">{text(activeVersion?.requiredLevels, "2")}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-500">{tText("Allowed permissions")}:</span>
            <span className="font-medium text-xs">
              {Array.isArray(activePerms) ? activePerms.join(", ") : String(activePerms ?? "")}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-500">{tText("Allowed roles")}:</span>
            <span className="font-medium text-xs">
              {Array.isArray(activeRoleKeys)
                ? activeRoleKeys.join(", ")
                : String(activeRoleKeys ?? "")}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-500">{tText("Version")}:</span>
            <span className="font-medium">{text(activeVersion?.version, "1")}</span>
          </div>
        </div>
      </Panel>

      <FormPanel
        action={tText("Create new version")}
        onSubmit={() =>
          save(
            "post",
            `/payroll/approval-policies/${existingId}/versions`,
            {
              fourEyesEnabled: Boolean(form.fourEyesEnabled),
              makerCanApprove: Boolean(form.makerCanApprove),
              requiredLevels: Number(form.requiredLevels),
              allowedPermissions: csv(form.allowedPermissions),
              allowedRoleKeys: csv(form.allowedRoleKeys),
              effectiveFrom: form.effectiveFrom,
            },
            onSaved,
          )
        }
        title={tText("New version")}
      >
        <p className="text-sm text-zinc-500">
          {tText("Change the rules above by creating a new version.")}
        </p>
        <div className="mt-4">
          <FieldGrid>
            <CheckboxField form={form} name="fourEyesEnabled" setForm={setForm} />
            <CheckboxField form={form} name="makerCanApprove" setForm={setForm} />
            <SelectField
              form={form}
              name="requiredLevels"
              options={["1", "2", "3", "4", "5"]}
              setForm={setForm}
            />
            <Field hint={tText("Comma-separated. Example: payroll.runs.approve")} label={tText(label("allowedPermissions"))}>
              <input
                className={inputClass}
                onChange={(event) =>
                  setForm((c) => ({ ...c, allowedPermissions: event.target.value }))
                }
                value={String(form.allowedPermissions ?? "")}
              />
            </Field>
            <Field hint={tText("Comma-separated. Example: HR_ADMIN,BUSINESS_ADMIN")} label={tText(label("allowedRoleKeys"))}>
              <input
                className={inputClass}
                onChange={(event) =>
                  setForm((c) => ({ ...c, allowedRoleKeys: event.target.value }))
                }
                value={String(form.allowedRoleKeys ?? "")}
              />
            </Field>
            <TextField
              form={form}
              hint={tText("Date this version takes effect")}
              name="effectiveFrom"
              setForm={setForm}
              type="date"
            />
          </FieldGrid>
        </div>
      </FormPanel>
    </div>
  );
}

function AccountingMappingForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const components = usePayrollResource("/payroll/components");
  const mappings = usePayrollResource("/payroll/accounting-mappings");
  const componentOptions = rows(components.data).map((component) => ({
    label: `${text(component.name, text(component.code, ""))} (${text(component.code, "-")})`,
    value: text(component.id, ""),
  })).filter((option) => option.value);

  const existingMappings = new Map<string, { debit: string; credit: string }>();
  rows(mappings.data).forEach((mapping) => {
    if (mapping.payComponentId && mapping.status === "ACTIVE") {
      existingMappings.set(String(mapping.payComponentId), {
        debit: String(mapping.debitAccountCode ?? ""),
        credit: String(mapping.creditAccountCode ?? ""),
      });
    }
  });

  const [form, setForm] = useState<FormState>({
    payComponentId: "",
    debitAccountCode: "",
    creditAccountCode: "",
    costCenterMode: "department",
    effectiveFrom: today,
  });

  const selectedComponentId = String(form.payComponentId ?? "");
  const hasMapping = existingMappings.has(selectedComponentId);

  return (
    <FormPanel
      action={tText("Create accounting mapping")}
      description={
        hasMapping
          ? tText("This component already has a mapping. Only create a new one if you need to update the codes.")
          : undefined
      }
      onSubmit={() =>
        save(
          "post",
          "/payroll/accounting-mappings",
          {
            payComponentId: form.payComponentId,
            debitAccountCode: form.debitAccountCode,
            creditAccountCode: form.creditAccountCode,
            costCenterRule: { mode: form.costCenterMode },
            effectiveFrom: form.effectiveFrom,
          },
          onSaved,
        )
      }
      title={tText("Accounting mapping")}
    >
      <FieldGrid>
        <OptionSelectField
          form={form}
          name="payComponentId"
          onValueChange={(value) => {
            const existing = existingMappings.get(value);
            if (existing) {
              setForm((c) => ({
                ...c,
                payComponentId: value,
                debitAccountCode: existing.debit,
                creditAccountCode: existing.credit,
              }));
            } else {
              setForm((c) => ({ ...c, payComponentId: value, debitAccountCode: "", creditAccountCode: "" }));
            }
          }}
          options={componentOptions}
          placeholder={components.loading ? tText("Loading pay components") : tText("Select pay component")}
          setForm={setForm}
        />
        <TextField form={form} name="debitAccountCode" setForm={setForm} />
        <TextField form={form} name="creditAccountCode" setForm={setForm} />
        <SelectField form={form} name="costCenterMode" options={["department", "office", "fixed"]} setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
    </FormPanel>
  );
}

function AuditFilters() {
  const { tText } = useTenantLocalization();
  return (
    <Panel className="p-5">
      <p className="text-sm text-zinc-500">
        {tText("Use the audit table pagination from the API response. Date range, action, entity type and entity ID filters are available on the backend endpoint and can be appended to the route query.")}
      </p>
    </Panel>
  );
}

function ResourceTable({
  canManage,
  data,
  employeeId,
  onChanged,
  tabKey,
}: {
  canManage: boolean;
  data: unknown;
  employeeId: string;
  onChanged: () => void;
  tabKey: PayrollTabKey;
}) {
  const { tText } = useTenantLocalization();
  const rowList = rows(data);
  if (!rowList.length) {
    return (
      <EmptyState
        body={tText("No records were returned for this payroll setup section.")}
        title={tText("No Payroll records yet")}
      />
    );
  }
  const columns = columnsFor(tabKey, rowList);
  return (
    <Panel className="overflow-hidden">
      <div className="grid gap-4 p-4">
        <ResourceNextStep
          canManage={canManage}
          onChanged={onChanged}
          rowList={rowList}
          tabKey={tabKey}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                {columns.map((column) => (
                  <th className="px-4 py-3" key={column}>
                    {tText(label(column))}
                  </th>
                ))}
                <th className="px-4 py-3">{tText("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rowList.map((row, index) => (
                <tr key={`${row.id ?? index}`}>
                  {columns.map((column) => (
                    <td className="max-w-[360px] px-4 py-3 align-top" key={column}>
                      {formatValue(row[column], tText)}
                    </td>
                  ))}
                  <td className="min-w-56 px-4 py-3 align-top">
                    <RowActions
                      canManage={canManage}
                      employeeId={employeeId}
                      onChanged={onChanged}
                      row={row}
                      tabKey={tabKey}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

function ResourceNextStep({
  canManage,
  onChanged,
  rowList,
  tabKey,
}: {
  canManage: boolean;
  onChanged: () => void;
  rowList: Array<Record<string, unknown>>;
  tabKey: PayrollTabKey;
}) {
  const { tText } = useTenantLocalization();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!canManage) return null;
  const readyLabel =
    tabKey === "components"
      ? tText("Make pay line ready")
      : tabKey === "structures"
        ? tText("Make salary template ready")
        : "";
  if (!readyLabel) return null;
  const draft = rowList
    .map((row) => {
      const version = rows(row.versions).find(
        (item) => text(item.status, "") === "DRAFT",
      );
      const hasPayLines = rows(version?.components).length > 0;
      return {
        id: text(row.id, ""),
        hasPayLines,
        name: text(row.name, text(row.code, "")),
        versionId: text(version?.id, ""),
      };
    })
    .find((item) =>
      item.id &&
      item.versionId &&
      (tabKey !== "structures" || item.hasPayLines),
    );
  if (!draft) return null;
  const endpoint =
    tabKey === "components"
      ? `/payroll/components/${draft.id}/versions/${draft.versionId}/activate`
      : `/payroll/salary-structures/${draft.id}/versions/${draft.versionId}/activate`;
  const body =
    tabKey === "components"
      ? tText("This pay line is saved but not usable in salary templates yet.")
      : tText("This salary template is saved but employees cannot use it yet.");
  const after =
    tabKey === "components"
      ? tText("After this, go to Structures and add it to a salary template.")
      : tText("After this, go to Compensation and assign it to employees.");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border theme-tone theme-tone-amber px-4 py-3">
      <div>
        <p className="text-sm font-semibold theme-tone-text theme-tone-amber">
          {tText("Next step")}: {readyLabel}
        </p>
        <p className="mt-1 text-sm leading-6 theme-tone-text theme-tone-amber">
          {draft.name ? `${draft.name}: ` : ""}
          {body} {after}
        </p>
      </div>
      <button
        className="inline-flex min-h-10 items-center rounded-lg theme-button-primary px-4 text-sm font-semibold shadow-sm"
        onClick={() => {
          const confirmText =
            tabKey === "components"
              ? tText("Make this pay line ready for salary templates?")
              : tText("Make this salary template ready for employees?");
          if (!window.confirm(confirmText)) return;
          setBusy(true);
          setError("");
          void save("post", endpoint, {}, onChanged)
            .catch((actionError) => setError(apiError(actionError, tText)))
            .finally(() => setBusy(false));
        }}
        disabled={busy}
        type="button"
      >
        {readyLabel}
      </button>
      {error ? <p className="basis-full text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function RowActions({
  canManage,
  employeeId,
  onChanged,
  row,
  tabKey,
}: {
  canManage: boolean;
  employeeId: string;
  onChanged: () => void;
  row: Record<string, unknown>;
  tabKey: PayrollTabKey;
}) {
  const { tText } = useTenantLocalization();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!canManage) return <span className="text-xs text-zinc-400">{tText("Read only")}</span>;
  const id = String(row.id ?? "");
  const actions: Array<{ label: string; endpoint: string; method?: "post" | "delete" | "patch"; body?: unknown; confirm?: string }> = [];
  if (tabKey === "calendars") {
    actions.push({ label: tText("Activate"), endpoint: `/payroll/calendars/${id}/activate`, confirm: tText("Activate this calendar version?") });
    actions.push({ label: tText("Deactivate"), endpoint: `/payroll/calendars/${id}/deactivate`, confirm: tText("Deactivate this calendar?") });
  }
  if (tabKey === "components" && row.versions && Array.isArray(row.versions)) {
    const version = rows(row.versions).find((item) => text(item.status, "") === "DRAFT");
    if (version?.id) actions.push({ label: tText("Make ready"), endpoint: `/payroll/components/${id}/versions/${version.id}/activate`, confirm: tText("Make this pay line ready for salary templates?") });
  }
  if (tabKey === "structures" && row.versions && Array.isArray(row.versions)) {
    const version = rows(row.versions).find((item) => text(item.status, "") === "DRAFT");
    if (version?.id && rows(version.components).length) actions.push({ label: tText("Make ready"), endpoint: `/payroll/salary-structures/${id}/versions/${version.id}/activate`, confirm: tText("Make this salary template ready for employees?") });
  }
  if (tabKey === "payment-details") {
    actions.push({ label: tText("Revoke"), endpoint: `/payroll/payment-details/${id}/status`, method: "patch", body: { status: "REVOKED" }, confirm: tText("Revoke this protected payment detail?") });
  }
  if (tabKey === "statutory-details") {
    actions.push({ label: tText("Revoke"), endpoint: `/payroll/statutory-details/${id}/status`, method: "patch", body: { status: "REVOKED" }, confirm: tText("Revoke this protected statutory detail?") });
  }
  if (tabKey === "compensation" && employeeId) {
    actions.push({ label: tText("End today"), endpoint: `/payroll/employees/${employeeId}/compensation/${id}/end`, method: "patch", body: { effectiveTo: today, reason: "Ended from payroll setup" }, confirm: tText("End this compensation version today?") });
  }
  if (!actions.length) return <span className="text-xs text-zinc-400">{tText("No action")}</span>;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          disabled={Boolean(busy)}
          key={action.label}
          onClick={() => {
            if (action.confirm && !window.confirm(tText(action.confirm))) return;
            setBusy(action.label);
            setError("");
            void save(action.method ?? "post", action.endpoint, action.body ?? {}, onChanged)
              .catch((actionError) => setError(apiError(actionError, tText)))
              .finally(() => setBusy(""));
          }}
          type="button"
        >
          {busy === action.label ? tText("Working") : action.label}
        </button>
      ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function PolicyMatrixResult({ data }: { data: unknown }) {
  const { tText } = useTenantLocalization();
  const value = dataObject(data);
  if (!value) {
    return (
      <EmptyState
        body={tText("Enter an employee and policy filter to resolve policy source evidence.")}
        title={tText("No matrix result")}
      />
    );
  }
  const cells = [
    "policyType",
    "sourceLevel",
    "sourceEntityId",
    "policyId",
    "policyVersionId",
    "schemaVersion",
    "effectiveFrom",
    "effectiveTo",
    "wasOverridden",
    "overridePath",
    "resolvedValue",
  ];
  return (
    <Panel className="p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cells.map((cell) => (
          <div key={cell}>
            <div className="text-xs font-semibold uppercase text-zinc-500">
              {tText(label(cell))}
            </div>
            <div className="mt-1 break-words text-sm text-zinc-900">
              {formatValue(value[cell], tText)}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FormPanel({
  action,
  children,
  confirm,
  description,
  hidePrimary,
  onSubmit,
  secondary,
  submitDisabled,
  submitDisabledReason,
  title,
}: {
  action: string;
  children: React.ReactNode;
  confirm?: string;
  description?: React.ReactNode;
  hidePrimary?: boolean;
  onSubmit: () => Promise<void>;
  secondary?: React.ReactNode;
  submitDisabled?: boolean;
  submitDisabledReason?: string;
  title: string;
}) {
  const { tText } = useTenantLocalization();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-3xl">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {secondary}
          {!hidePrimary ? <div className="grid gap-1">
            <PrimaryButton
              disabled={busy || submitDisabled}
              onClick={() => {
                if (submitDisabled) return;
                if (confirm && !window.confirm(confirm)) return;
                setBusy(true);
                setError("");
                setMessage("");
                void onSubmit()
                  .then(() => setMessage(tText("Saved.")))
                  .catch((saveError) => setError(apiError(saveError, tText)))
                  .finally(() => setBusy(false));
              }}
            >
              {action}
            </PrimaryButton>
            {submitDisabled && submitDisabledReason ? (
              <p className="max-w-72 text-xs theme-tone-text theme-tone-amber">
                {submitDisabledReason}
              </p>
            ) : null}
          </div> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
      {message && <p className="mt-3 text-sm theme-tone-text theme-tone-emerald">{message}</p>}
      {error && <div className="mt-3"><ErrorState message={error} /></div>}
    </Panel>
  );
}

function InlineAction({
  action,
  disabled,
  disabledReason,
  onClick,
}: {
  action: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => Promise<void>;
}) {
  const { tText } = useTenantLocalization();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="grid gap-1">
      <button
        className="inline-flex h-11 items-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        disabled={disabled || busy}
        onClick={() => {
          setBusy(true);
          setError("");
          void onClick()
            .catch((actionError) => setError(apiError(actionError, tText)))
            .finally(() => setBusy(false));
        }}
        type="button"
      >
        {tText(action)}
      </button>
      {disabled && disabledReason ? (
        <p className="max-w-72 text-xs theme-tone-text theme-tone-amber">{disabledReason}</p>
      ) : null}
      {error && <p className="max-w-72 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SetupHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm leading-6 text-foreground">
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function EmployeeSelect({
  error,
  loading,
  onChange,
  options,
  value,
}: {
  error: string;
  loading: boolean;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const { tText } = useTenantLocalization();
  return (
    <div className="grid gap-2">
      <Field label={tText("Employee")}>
        <select
          className={inputClass}
          onChange={(event) => onChange(event.target.value)}
          value={options.some((option) => option.value === value) ? value : ""}
        >
          <option value="">
            {loading ? tText("Loading employees") : tText("Select employee")}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      {error && (
        <Field label={tText("Employee ID")}>
          <input
            className={inputClass}
            onChange={(event) => onChange(event.target.value)}
            placeholder={tText("Paste an employee UUID")}
            value={value}
          />
        </Field>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function TextField({
  disabled,
  form,
  hint,
  name,
  setForm,
  type = "text",
}: {
  disabled?: boolean;
  form: FormState;
  hint?: string;
  name: string;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  type?: string;
}) {
  const { tText } = useTenantLocalization();
  return (
    <Field hint={hint} label={tText(label(name))}>
      <input
        className={inputClass}
        disabled={disabled}
        onChange={(event) => {
          const value = name === "code"
            ? event.target.value.toUpperCase()
            : event.target.value;
          setForm((current) => ({ ...current, [name]: value }));
        }}
        type={type}
        value={String(form[name] ?? "")}
      />
    </Field>
  );
}

function SelectField({
  disabled,
  form,
  name,
  options,
  setForm,
}: {
  disabled?: boolean;
  form: FormState;
  name: string;
  options: string[];
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const { tText } = useTenantLocalization();
  return (
    <Field label={tText(label(name))}>
      <select
        className={inputClass}
        disabled={disabled}
        onChange={(event) =>
          setForm((current) => ({ ...current, [name]: event.target.value }))
        }
        value={String(form[name] ?? "")}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
    </Field>
  );
}

function OptionSelectField({
  disabled,
  form,
  hint,
  labelText,
  name,
  onValueChange,
  options,
  placeholder,
  setForm,
}: {
  disabled?: boolean;
  form: FormState;
  hint?: string;
  labelText?: string;
  name: string;
  onValueChange?: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const { tText } = useTenantLocalization();
  return (
    <Field hint={hint} label={labelText ?? tText(label(name))}>
      <select
        className={inputClass}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;
          setForm((current) => ({ ...current, [name]: nextValue }));
          onValueChange?.(nextValue);
        }}
        value={String(form[name] ?? "")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function PayLineChecklist({
  addedPayLines,
  disabled,
  existingPercentageTotal,
  loading,
  onChange,
  onReorderAdded,
  onRuleChange,
  options,
  reordering,
  remainingPercentage,
  rules,
  selected,
  selectedPercentageTotal,
}: {
  addedPayLines: AddedPayLine[];
  disabled: boolean;
  existingPercentageTotal: number;
  loading: boolean;
  onChange: (value: string[]) => void;
  onReorderAdded: (value: AddedPayLine[]) => void;
  onRuleChange: (id: string, updates: Partial<PayLineRule>) => void;
  options: Array<{ label: string; value: string }>;
  reordering: boolean;
  remainingPercentage: number;
  rules: Record<string, PayLineRule>;
  selected: string[];
  selectedPercentageTotal: number;
}) {
  const { tText } = useTenantLocalization();
  const [draggedId, setDraggedId] = useState("");
  const selectedOptions = options.filter((option) =>
    selected.includes(option.value),
  );
  function moveAddedPayLine(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= addedPayLines.length) return;
    const next = [...addedPayLines];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    onReorderAdded(next);
  }
  function dropAddedPayLine(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = addedPayLines.findIndex(
      (item) => item.componentVersionId === draggedId,
    );
    const targetIndex = addedPayLines.findIndex(
      (item) => item.componentVersionId === targetId,
    );
    if (fromIndex < 0 || targetIndex < 0) return;
    const next = [...addedPayLines];
    const [item] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, item);
    onReorderAdded(next);
    setDraggedId("");
  }
  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-zinc-200 p-4">
      <div>
        <h4 className="text-sm font-semibold text-zinc-900">
          {tText("Pay lines in this salary template")}
        </h4>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          {tText("A salary template can contain many pay lines. Select all ready pay lines you want to add, then click Add selected pay lines.")}
        </p>
      </div>
      {addedPayLines.length ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-zinc-900">
            {tText("Drag pay lines to change order")}
          </p>
          {addedPayLines.map((line, index) => (
            <div
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm"
              draggable={!disabled && !reordering}
              key={line.componentVersionId}
              onDragEnd={() => setDraggedId("")}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedId(line.componentVersionId)}
              onDrop={() => dropAddedPayLine(line.componentVersionId)}
            >
              <GripVertical className="size-4 shrink-0 text-zinc-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900">
                  {line.label}
                </p>
                <p className="text-xs text-zinc-500">{line.amountLabel}</p>
              </div>
              <button
                aria-label={tText("Move up")}
                className="grid size-9 place-items-center rounded-lg border border-zinc-200 text-zinc-600 disabled:opacity-40"
                disabled={disabled || reordering || index === 0}
                onClick={() => moveAddedPayLine(index, -1)}
                type="button"
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                aria-label={tText("Move down")}
                className="grid size-9 place-items-center rounded-lg border border-zinc-200 text-zinc-600 disabled:opacity-40"
                disabled={
                  disabled ||
                  reordering ||
                  index === addedPayLines.length - 1
                }
                onClick={() => moveAddedPayLine(index, 1)}
                type="button"
              >
                <ArrowDown className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm theme-tone-text theme-tone-amber">
          {disabled
            ? tText("Create or select an editable salary template first.")
            : tText("No pay lines added to this template yet.")}
        </p>
      )}
      <div className="grid gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-foreground md:grid-cols-3">
        <div>
          <span className="font-semibold">{tText("Already used")}: </span>
          {formatPercentageInput(existingPercentageTotal)}%
        </div>
        <div>
          <span className="font-semibold">{tText("Selected now")}: </span>
          {formatPercentageInput(selectedPercentageTotal)}%
        </div>
        <div>
          <span className="font-semibold">{tText("Remaining")}: </span>
          {formatPercentageInput(remainingPercentage)}%
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-zinc-500">{tText("Loading pay lines")}</p>
        ) : options.length ? (
          options.map((option) => (
            <label
              className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-800"
              key={option.value}
            >
              <input
                checked={selected.includes(option.value)}
                disabled={disabled}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selected, option.value]);
                    return;
                  }
                  onChange(selected.filter((value) => value !== option.value));
                }}
                type="checkbox"
              />
              {option.label}
            </label>
          ))
        ) : (
          <p className="text-sm text-zinc-500">
            {tText("No more ready pay lines are available to add.")}
          </p>
        )}
      </div>
      {selectedOptions.length ? (
        <div className="mt-2 grid gap-3">
          <h5 className="text-sm font-semibold text-zinc-900">
            {tText("Amount for selected pay lines")}
          </h5>
          {selectedOptions.map((option, index) => {
            const rule =
              rules[option.value] ??
              defaultPayLineRule();
            return (
              <div
                className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 lg:grid-cols-[minmax(180px,1fr)_220px_minmax(180px,1fr)]"
                key={option.value}
              >
                <div>
                  <p className="text-sm font-bold text-zinc-900">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {rule.amountType === "percentage"
                      ? tText("Uses a percentage of this employee's monthly salary.")
                      : rule.amountType === "fixed"
                        ? tText("Uses the same fixed amount every month.")
                        : tText("Uses an advanced formula.")}
                  </p>
                </div>
                <Field label={tText("Amount type")}>
                  <select
                    className={inputClass}
                    disabled={disabled}
                    onChange={(event) => {
                      const amountType = event.target.value as PayLineAmountType;
                      onRuleChange(option.value, {
                        amountType,
                        percentage:
                          amountType === "percentage" && !rule.percentage
                            ? formatPercentageInput(remainingPercentage)
                            : rule.percentage,
                      });
                    }}
                    value={rule.amountType}
                  >
                    <option value="percentage">
                      {tText("Percentage of monthly salary")}
                    </option>
                    <option value="fixed">{tText("Fixed amount")}</option>
                    <option value="formula">{tText("Formula")}</option>
                  </select>
                </Field>
                {rule.amountType === "percentage" ? (
                  <Field label={tText("Percentage")}>
                    <input
                      className={inputClass}
                      disabled={disabled}
                      max="100"
                      min="0"
                      onChange={(event) =>
                        onRuleChange(option.value, {
                          percentage: event.target.value,
                        })
                      }
                      step="0.01"
                      type="number"
                      value={rule.percentage}
                    />
                  </Field>
                ) : rule.amountType === "fixed" ? (
                  <Field label={tText("Fixed amount minor")}>
                    <input
                      className={inputClass}
                      disabled={disabled}
                      min="0"
                      onChange={(event) =>
                        onRuleChange(option.value, {
                          fixedAmountMinor: event.target.value,
                        })
                      }
                      type="number"
                      value={rule.fixedAmountMinor}
                    />
                  </Field>
                ) : (
                  <Field label={tText("Formula")}>
                    <input
                      className={inputClass}
                      disabled={disabled}
                      onChange={(event) =>
                        onRuleChange(option.value, {
                          formulaReference: event.target.value,
                        })
                      }
                      placeholder="baseAmountMinor * 10 / 100"
                      value={rule.formulaReference}
                    />
                  </Field>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CheckboxField({
  form,
  name,
  setForm,
}: {
  form: FormState;
  name: string;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const { tText } = useTenantLocalization();
  return (
    <label className="flex h-11 items-center gap-3 rounded-lg border border-zinc-300 px-3 text-sm font-medium">
      <input
        checked={Boolean(form[name])}
        onChange={(event) =>
          setForm((current) => ({ ...current, [name]: event.target.checked }))
        }
        type="checkbox"
      />
      {tText(label(name))}
    </label>
  );
}

function endpointForEmployee(tabKey: PayrollTabKey, employeeId: string) {
  if (!employeeId) return "";
  if (tabKey === "employee-profile")
    return `/payroll/employees/${employeeId}/profile`;
  if (tabKey === "compensation")
    return `/payroll/employees/${employeeId}/compensation/history`;
  if (tabKey === "payment-details")
    return `/payroll/employees/${employeeId}/payment-details`;
  if (tabKey === "statutory-details")
    return `/payroll/employees/${employeeId}/statutory-details`;
  return "";
}

async function save(
  method: "post" | "patch" | "delete",
  endpoint: string,
  body: unknown,
  onSaved: () => void,
) {
  if (method === "post") await apiClient.post(endpoint, body);
  if (method === "patch") await apiClient.patch(endpoint, body);
  if (method === "delete") await apiClient.delete(endpoint);
  onSaved();
}

function rows(value: unknown): Array<Record<string, unknown>> {
  const payload =
    value && typeof value === "object" && "data" in value
      ? (value as { data: unknown }).data
      : value;
  if (Array.isArray(payload)) {
    return payload.map((item) =>
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : { value: item },
    );
  }
  if (payload && typeof payload === "object") {
    return [payload as Record<string, unknown>];
  }
  return payload === null || payload === undefined ? [] : [{ value: payload }];
}

function dataObject(value: unknown): Record<string, unknown> | null {
  const row = rows(value)[0];
  return row ?? null;
}

function columnsFor(tabKey: PayrollTabKey, rowList: Array<Record<string, unknown>>) {
  const preferred: Record<string, string[]> = {
    overview: [],
    settings: ["countryCode", "defaultCurrency", "payFrequency", "moduleStatus", "version"],
    calendars: ["code", "name", "frequency", "status", "version", "effectiveFrom", "effectiveTo"],
    "pay-groups": ["code", "name", "currency", "countryCode", "status", "version"],
    matrix: [],
    policies: ["code", "name", "category", "status", "versions"],
    components: ["code", "name", "type", "status", "versions"],
    structures: ["code", "name", "currency", "status", "versions"],
    "employee-profile": ["employeeId", "payrollStatus", "payrollCountry", "paymentMethod", "salaryHold", "version"],
    compensation: ["baseAmountMinor", "currency", "effectiveFrom", "effectiveTo", "version", "reason"],
    "payment-details": ["paymentMethod", "bankName", "accountHolderName", "accountNumberMasked", "ibanMasked", "routingMasked", "status", "version"],
    "statutory-details": ["countryCode", "identifierType", "identifierMasked", "status", "version"],
    "approval-policies": ["id","name", "status", "versions"],
    accounting: ["payComponentId", "debitAccountCode", "creditAccountCode", "status", "version"],
    audit: ["action", "entityType", "entityId", "actorUserId", "createdAt"],
  };
  const selected = preferred[tabKey] ?? [];
  const available = new Set(rowList.flatMap((row) => Object.keys(row)));
  const columns = selected.filter((column) => available.has(column));
  return columns.length ? columns : Array.from(available).slice(0, 8);
}

function salaryStructureVersionOptions(
  structures: Array<Record<string, unknown>>,
  structureId: string,
  tText: (value: string) => string,
) {
  const selected = structures.find((structure) => text(structure.id, "") === structureId);
  if (!selected) return [];
  return rows(selected.versions).map((version) => ({
    label: `${text(selected.code, tText("Structure"))} v${text(version.version, "1")} - ${text(version.status, "DRAFT")}`,
    status: text(version.status, "DRAFT"),
    value: text(version.id, ""),
  })).filter((option) => option.value);
}

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function defaultPayLineRule(): PayLineRule {
  return {
    amountType: "percentage",
    fixedAmountMinor: "0",
    formulaReference: "",
    percentage: "0",
  };
}

function payLineRuleInvalid(rule: PayLineRule | undefined) {
  if (!rule) return true;
  if (rule.amountType === "percentage") {
    const percentage = Number(rule.percentage);
    return (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    );
  }
  if (rule.amountType === "fixed") {
    const fixed = Number(rule.fixedAmountMinor);
    return !Number.isFinite(fixed) || fixed < 0;
  }
  return !rule.formulaReference.trim();
}

function percentageToBasisPoints(value: string) {
  return Math.round(Number(value || 0) * 100);
}

function formatPercentageInput(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function payLineAmountLabel(
  item: Record<string, unknown>,
  tText: (value: string) => string,
) {
  const percentage = text(item.percentageBasisPoints, "");
  if (percentage) return `${formatPercentageInput(Number(percentage) / 100)}%`;
  const formula = text(item.formulaReference, "");
  if (formula) return tText("Formula");
  const fixed = text(item.fixedAmountMinor, "");
  return fixed ? `${tText("Fixed")} ${fixed}` : tText("Fixed 0");
}

function formatValue(value: unknown, t?: (s: string) => string) {
  const tr = t ?? ((s: string) => s);
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? tr("Yes") : tr("No");
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return `${value.length} ${tr("items")}`;
  return JSON.stringify(value);
}

function clean(form: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(form).filter(([, value]) => value !== "" && value !== undefined),
  );
}

function emptyToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}

function text(value: unknown, fallback: string) {
  return value === null || value === undefined ? fallback : String(value);
}

function csv(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function policyConfig(form: FormState) {
  return {
    schemaVersion: form.schemaVersion,
    policyType: form.category,
    method: form.method,
  };
}

function decimalToMinor(value: string, currency: string) {
  const scale = currency === "OMR" ? 3 : 2;
  const [whole, fraction = ""] = value.split(".");
  return `${whole}${fraction.padEnd(scale, "0").slice(0, scale)}`.replace(/^0+(?=\d)/, "");
}

function apiError(error: unknown, tr?: (s: string) => string) {
  const t = tr ?? ((s: string) => s);
  const response = error as {
    response?: { data?: { message?: string; code?: string; details?: Array<{ field: string; messages: string[] }> } };
    message?: string;
  };
  const code = response.response?.data?.code;
  const message = response.response?.data?.message ?? response.message;
  if (code === "VERSION_CONFLICT") {
    return t("Version conflict. Refresh the section and retry with the latest version.");
  }
  if (code === "POLICY_CODE_EXISTS") {
    return message ?? t("A policy with this code already exists.");
  }
  if (code === "APPROVAL_POLICY_EXISTS") {
    return message ?? t("Only one approval policy is allowed per workspace.");
  }
  if (code === "VALIDATION_FAILED") {
    const details = response.response?.data?.details;
    if (details?.length) {
      return details.map((d) => `${d.field}: ${d.messages.join(", ")}`).join("; ");
    }
    return message ?? t("Invalid input. Check the fields marked in red.");
  }
  return message ?? t("Request failed. Check your input and try again.");
}

const employeeTabs = new Set<PayrollTabKey>([
  "employee-profile",
  "compensation",
  "payment-details",
  "statutory-details",
]);

export function payrollFoundationTabKeysForPermissions(
  permissionList: string[],
) {
  const permissions = new Set(permissionList);
  return payrollFoundationTabs
    .filter((tab) => permissions.has(tab.permission))
    .map((tab) => tab.key);
}
