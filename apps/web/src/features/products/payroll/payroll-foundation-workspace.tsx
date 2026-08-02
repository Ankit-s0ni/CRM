"use client";

import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileClock,
  GitBranch,
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

export const payrollFoundationTabs: PayrollTab[] = [
  {
    key: "overview",
    label: "Overview",
    endpoint: "",
    permission: "payroll.settings.read",
    icon: WalletCards,
    description: "Setup progress and items that still need attention.",
  },
  {
    key: "settings",
    label: "Settings",
    endpoint: "/payroll/settings",
    permission: "payroll.settings.read",
    managePermission: "payroll.settings.manage",
    icon: Settings2,
    description: "Country, currency, frequency, payout and rounding defaults.",
  },
  {
    key: "calendars",
    label: "Calendars",
    endpoint: "/payroll/calendars",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: CalendarDays,
    description: "Versioned period and payout-date rules.",
  },
  {
    key: "pay-groups",
    label: "Pay groups",
    endpoint: "/payroll/pay-groups",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: Layers3,
    description: "Employee cohorts linked to calendars and policy overrides.",
  },
  {
    key: "matrix",
    label: "Policy matrix",
    endpoint: "",
    permission: "payroll.policies.read",
    icon: GitBranch,
    description: "Backend-resolved policy source and override evidence.",
  },
  {
    key: "policies",
    label: "Policies",
    endpoint: "/payroll/policies",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: ScrollText,
    description: "Proration, rounding, working-day and reference policies.",
  },
  {
    key: "components",
    label: "Components",
    endpoint: "/payroll/components",
    permission: "payroll.components.read",
    managePermission: "payroll.components.manage",
    icon: Coins,
    description: "Pay lines such as basic salary, allowance, deduction, and contribution.",
  },
  {
    key: "structures",
    label: "Structures",
    endpoint: "/payroll/salary-structures",
    permission: "payroll.structures.read",
    managePermission: "payroll.structures.manage",
    icon: Banknote,
    description: "Salary templates made from ready pay lines.",
  },
  {
    key: "employee-profile",
    label: "Employee profile",
    endpoint: "",
    permission: "payroll.compensation.read",
    managePermission: "payroll.compensation.manage",
    icon: UserRound,
    description: "Employee payroll enrollment and pay-group assignment.",
  },
  {
    key: "compensation",
    label: "Compensation",
    endpoint: "",
    permission: "payroll.compensation.read",
    managePermission: "payroll.compensation.manage",
    icon: Banknote,
    description: "Effective compensation revisions using minor-unit storage.",
  },
  {
    key: "payment-details",
    label: "Payment details",
    endpoint: "",
    permission: "payroll.protected-data.read",
    managePermission: "payroll.protected-data.manage",
    icon: LockKeyhole,
    description: "Masked bank, IBAN and routing details.",
  },
  {
    key: "statutory-details",
    label: "Statutory details",
    endpoint: "",
    permission: "payroll.protected-data.read",
    managePermission: "payroll.protected-data.manage",
    icon: ShieldCheck,
    description: "Masked country-scoped statutory identifiers.",
  },
  {
    key: "approval-policies",
    label: "Approvals",
    endpoint: "/payroll/approval-policies",
    permission: "payroll.policies.read",
    managePermission: "payroll.policies.manage",
    icon: BadgeCheck,
    description: "Four-eyes, maker and approval-level configuration.",
  },
  {
    key: "accounting",
    label: "Accounting",
    endpoint: "/payroll/accounting-mappings",
    permission: "payroll.accounting.read",
    managePermission: "payroll.accounting.manage",
    icon: FileClock,
    description: "Pay component to debit/credit mapping configuration.",
  },
  {
    key: "audit",
    label: "Audit",
    endpoint: "/payroll/audit?limit=25",
    permission: "payroll.audit.read",
    icon: History,
    description: "Payroll setup audit history.",
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
      description={tText("Configure payroll settings, calendars, pay groups, policies, compensation data, approvals, accounting, and audit history before running payroll.")}
    >
      {!visibleTabs.length ? (
        <ErrorState message={tText("Your account does not have Payroll setup permissions.")} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Panel className="p-2">
            <div className="grid gap-1">
              {visibleTabs.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition",
                      activeKey === item.key
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                    )}
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    type="button"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{tText(item.label)}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
          {tab && (
            <PayrollTabPanel
              employeeId={employeeId}
              onEmployeeIdChange={setEmployeeId}
              permissions={permissions}
              tab={tab}
            />
          )}
        </div>
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
              <tab.icon className="size-5 text-primary" />
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
      {tab.key === "overview" ? (
        <PayrollOverview permissions={permissions} />
      ) : tab.key === "matrix" ? (
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

function PayrollOverview({ permissions }: { permissions: Set<string> }) {
  const { tText } = useTenantLocalization();
  const settings = usePayrollResource("/payroll/settings");
  const calendars = usePayrollResource("/payroll/calendars");
  const payGroups = usePayrollResource("/payroll/pay-groups");
  const policies = usePayrollResource("/payroll/policies");
  const components = usePayrollResource("/payroll/components");
  const structures = usePayrollResource("/payroll/salary-structures");
  const approvals = usePayrollResource("/payroll/approval-policies");
  const accounting = usePayrollResource("/payroll/accounting-mappings");

  const cards = [
    statusCard(tText("Settings"), Boolean(dataObject(settings.data)), "/app/settings/payroll"),
    statusCard(tText("Active calendar"), rows(calendars.data).some((item) => item.status === "ACTIVE"), ""),
    countCard(tText("Pay groups"), rows(payGroups.data).length),
    countCard(tText("Policies"), rows(policies.data).length),
    countCard(tText("Components"), rows(components.data).length),
    countCard(tText("Salary structures"), rows(structures.data).length),
    statusCard(tText("Approval policy"), rows(approvals.data).length > 0, ""),
    statusCard(tText("Accounting mappings"), rows(accounting.data).length > 0, ""),
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Panel className="p-5" key={card.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-zinc-500">
                  {card.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-zinc-900">
                  {card.value}
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  card.ready
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                {tText(card.ready ? "Ready" : "Needed")}
              </span>
            </div>
          </Panel>
        ))}
      </div>
      <Panel className="p-5">
        <h3 className="text-base font-semibold">{tText("Setup sequence")}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            tText("Payroll settings"),
            tText("Payroll calendar"),
            tText("Pay group"),
            tText("Policies"),
            tText("Components"),
            tText("Salary structure"),
            tText("Employee payroll profile"),
            tText("Compensation"),
            tText("Protected details"),
            tText("Approval policy"),
            tText("Accounting mapping"),
          ].map((item) => (
            <div className="flex items-center gap-3 text-sm" key={item}>
              <CheckCircle2 className="size-4 text-primary" />
              {item}
            </div>
          ))}
        </div>
        {!permissions.has("payroll.protected-data.read") && (
          <p className="mt-4 text-sm text-zinc-500">
            {tText("Protected detail setup is hidden because this user lacks the dedicated protected-data permission.")}
          </p>
        )}
      </Panel>
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
        <p className="mt-3 text-sm text-red-700">{calendars.error}</p>
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
        <Field label={tText("Policy ID")}>
          <input
            className={inputClass}
            onChange={(event) => setPolicyId(event.target.value)}
            value={policyId}
          />
        </Field>
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
  return (
    <div className="grid gap-5">
      <Panel className="p-5">
        <FieldGrid>
          <TextField form={form} name="employeeId" setForm={setForm} />
          <TextField form={form} name="payGroupId" setForm={setForm} />
          <TextField form={form} name="salaryStructureVersionId" setForm={setForm} />
          <SelectField form={form} name="policyType" options={["PRORATION", "WORKING_DAY_BASIS", "ROUNDING", "OVERTIME_TREATMENT", "LOSS_OF_PAY_TREATMENT", "JOINER_TREATMENT", "LEAVER_TREATMENT"]} setForm={setForm} />
          <TextField form={form} name="effectiveDate" setForm={setForm} type="date" />
        </FieldGrid>
      </Panel>
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
        <p className="mt-3 text-sm text-red-700">{components.error}</p>
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
    fixedAmountMinor: "0",
    calculationOrder: "100",
    effectiveFrom: today,
  });
  const [selectedPayLineIds, setSelectedPayLineIds] = useState<string[]>([]);
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
  const addedPayLineLabels = rows(selectedEditableSetup?.components)
    .map((item) => {
      const componentVersionId =
        text(item.payComponentVersionId, "") ||
        text(dataObject(item.componentVersion)?.id, "");
      const optionLabel = activeComponentLabelByVersionId.get(componentVersionId);
      if (optionLabel) return optionLabel;
      const version = dataObject(item.componentVersion);
      const component = dataObject(version?.component);
      const code = text(component?.code, text(item.code, ""));
      const name = text(component?.name, text(item.name, code));
      return name || code ? `${name}${code ? ` (${code})` : ""}` : "";
    })
    .filter(Boolean);
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
    setMode("edit");
  };
  const selectedEditableStructureId =
    text(selectedStructure?.id, "") || text(existingStructureByCode?.id, "");
  const canEditTemplate = Boolean(selectedEditableStructureId);
  const canMakeReady = Boolean(
    selectedEditableStructureId &&
    inferredEditableSetupId &&
    addedPayLineLabels.length,
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
              hasNoMorePayLinesToAdd
            }
            disabledReason={
              !activeComponentOptions.length
                ? tText("Go to Components and make at least one pay line ready first.")
                : !inferredEditableSetupId
                  ? tText("Click Start editing selected template first.")
                  : hasNoMorePayLinesToAdd
                    ? tText("All ready pay lines are already in this salary template.")
                  : tText("Select one or more ready pay lines first.")
            }
            onClick={async () => {
              const payLineIdsToAdd = selectedPayLineIds.filter(
                (payLineId) => !addedPayLineIds.has(payLineId),
              );
              for (const [index, payComponentVersionId] of payLineIdsToAdd.entries()) {
                await apiClient.post(
                  `/payroll/salary-structures/versions/${inferredEditableSetupId}/components`,
                  {
                    payComponentVersionId,
                    fixedAmountMinor: form.fixedAmountMinor,
                    calculationOrder: Number(form.calculationOrder) + index,
                    required: true,
                  },
                );
              }
              setSelectedPayLineIds([]);
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
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {tText("This salary template already exists")}
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                {tText("Use the existing salary template instead of creating another one with the same code.")}
              </p>
              <button
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
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
              }}
              options={structureOptions}
              placeholder={structures.loading ? tText("Loading structures") : tText("Select salary template")}
              setForm={setForm}
            />
            <TextField form={form} hint={tText("Optional default line amount in minor units. Keep 0 when the amount comes from employee compensation.")} name="fixedAmountMinor" setForm={setForm} />
            <TextField form={form} hint={tText("Controls payslip line order. Basic 100, allowances 200, deductions 900.")} name="calculationOrder" setForm={setForm} />
          </FieldGrid>
          <PayLineChecklist
            addedLabels={addedPayLineLabels}
            disabled={!inferredEditableSetupId}
            loading={components.loading}
            onChange={setSelectedPayLineIds}
            options={availablePayLineOptions}
            selected={selectedPayLineIds}
          />
          {!inferredEditableSetupId && form.structureId ? (
            <p className="mt-3 text-sm text-amber-700">
              {tText("Click Start editing selected template before adding pay lines.")}
            </p>
          ) : null}
          {canMakeReady ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {tText("Next step: make this salary template ready")}
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                {tText("Employees cannot use this template in Compensation until you click Make template ready.")}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
      {!activeComponentOptions.length && (
        <p className="mt-3 text-sm text-amber-700">
          {tText("No ready pay lines yet. Go to Components, create BASIC, then click Make pay line ready.")}
        </p>
      )}
      {structures.error && (
        <p className="mt-3 text-sm text-red-700">{structures.error}</p>
      )}
      {components.error && (
        <p className="mt-3 text-sm text-red-700">{components.error}</p>
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
        <p className="mt-3 text-sm text-red-700">{payGroups.error}</p>
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
        <p className="mt-3 text-sm text-amber-700">
          {structureVersionOptions.length
            ? tText("Select a salary structure version before creating compensation.")
            : tText("Activate a salary structure version before creating compensation.")}
        </p>
      )}
      {structures.error && (
        <p className="mt-3 text-sm text-red-700">{structures.error}</p>
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
        <p className="text-sm text-amber-700">
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
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          {tText("Next step")}: {readyLabel}
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          {draft.name ? `${draft.name}: ` : ""}
          {body} {after}
        </p>
      </div>
      <button
        className="inline-flex min-h-10 items-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
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
      {error ? <p className="basis-full text-sm text-red-700">{error}</p> : null}
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
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
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
              <p className="max-w-72 text-xs text-amber-700">
                {submitDisabledReason}
              </p>
            ) : null}
          </div> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
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
        <p className="max-w-72 text-xs text-amber-700">{disabledReason}</p>
      ) : null}
      {error && <p className="max-w-72 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function SetupHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
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
      {error && <p className="text-sm text-red-700">{error}</p>}
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
  addedLabels,
  disabled,
  loading,
  onChange,
  options,
  selected,
}: {
  addedLabels: string[];
  disabled: boolean;
  loading: boolean;
  onChange: (value: string[]) => void;
  options: Array<{ label: string; value: string }>;
  selected: string[];
}) {
  const { tText } = useTenantLocalization();
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
      {addedLabels.length ? (
        <div className="flex flex-wrap gap-2">
          {addedLabels.map((labelValue) => (
            <span
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
              key={labelValue}
            >
              {labelValue}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-amber-700">
          {disabled
            ? tText("Create or select an editable salary template first.")
            : tText("No pay lines added to this template yet.")}
        </p>
      )}
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

function formatValue(value: unknown, t?: (s: string) => string) {
  const tr = t ?? ((s: string) => s);
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? tr("Yes") : tr("No");
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return `${value.length} ${tr("items")}`;
  return JSON.stringify(value);
}

function statusCard(labelValue: string, ready: boolean, href: string) {
  return { label: labelValue, ready, value: ready ? "Ready" : href ? "Start" : "Needed" };
}

function countCard(labelValue: string, count: number) {
  return { label: labelValue, ready: count > 0, value: String(count) };
}

function clean(form: FormState) {
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
