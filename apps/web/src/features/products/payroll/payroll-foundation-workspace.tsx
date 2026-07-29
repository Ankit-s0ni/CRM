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
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
    description: "Setup progress and incomplete foundation steps.",
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
    description: "Earnings, deductions, benefits and employer contribution components.",
  },
  {
    key: "structures",
    label: "Structures",
    endpoint: "/payroll/salary-structures",
    permission: "payroll.structures.read",
    managePermission: "payroll.structures.manage",
    icon: Banknote,
    description: "Versioned compensation structures and component configuration.",
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
    description: "Safe Payroll foundation audit history.",
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
      title={tText("Payroll foundation")}
      description={tText("Complete Phase 1 payroll setup without payroll runs, calculations, payslips, journals or payments.")}
    >
      {!visibleTabs.length ? (
        <ErrorState message={tText("Your account does not have Payroll foundation permissions.")} />
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
            <Field label={tText("Employee ID")}>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 size-4 text-zinc-400" />
                <input
                  className={`${inputClass} pl-9`}
                  onChange={(event) => onEmployeeIdChange(event.target.value)}
                  placeholder={tText("Paste an employee UUID")}
                  value={employeeId}
                />
              </div>
            </Field>
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
  const { tText } = useTenantLocalization();
  const [state, setState] = useState<ResourceState>({
    data: null,
    loading: false,
    error: "",
  });
  const refresh = useCallback(() => {
    if (!endpoint) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    apiClient
      .get(endpoint)
      .then(({ data }) => setState({ data, loading: false, error: "" }))
      .catch((error) =>
        setState({
          data: null,
          loading: false,
          error: apiError(error, tText),
        }),
      );
  }, [endpoint, tText]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  return { ...state, refresh };
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
    return <ApprovalPolicyForm onSaved={onSaved} />;
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
  const [form, setForm] = useState<FormState>({
    countryCode: text(current?.countryCode, "OM"),
    defaultCurrency: text(current?.defaultCurrency, "OMR"),
    locale: text(current?.locale, "en-OM"),
    timezone: text(current?.timezone, "Asia/Muscat"),
    payFrequency: text(current?.payFrequency, "MONTHLY"),
    workingDayBasis: text(current?.workingDayBasis, "CALENDAR_DAYS"),
    effectiveFrom: text(current?.effectiveFrom, today).slice(0, 10),
    version: text(current?.version, "1"),
  });
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
        <TextField form={form} name="calendarId" setForm={setForm} />
        <TextField form={form} name="currency" setForm={setForm} />
        <TextField form={form} name="countryCode" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
    </FormPanel>
  );
}

function PolicyForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    code: "PRORATION_DEFAULT",
    name: "Default proration",
    category: "PRORATION",
    method: "calendar-days",
    schemaVersion: "proration-v1",
    effectiveFrom: today,
  });
  const [policyId, setPolicyId] = useState("");
  const config = policyConfig(form);
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
        <TextField form={form} name="code" setForm={setForm} />
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
          setForm={setForm}
        />
        <Field label={tText("Policy ID")}>
          <input
            className={inputClass}
            onChange={(event) => setPolicyId(event.target.value)}
            value={policyId}
          />
        </Field>
        <TextField form={form} name="method" setForm={setForm} />
        <TextField form={form} name="schemaVersion" setForm={setForm} />
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
  return (
    <FormPanel
      action={tText("Create component")}
      secondary={
        <InlineAction
          action={tText("Create version")}
          disabled={!form.componentId}
          onClick={() =>
            save(
              "post",
              `/payroll/components/${form.componentId}/versions`,
              {
                valueMode: form.valueMode,
                taxable: Boolean(form.taxable),
                statutory: Boolean(form.statutory),
                recurring: Boolean(form.recurring),
                calculationOrder: Number(form.calculationOrder),
                currencyBehavior: form.currencyBehavior,
                roundingBehavior: { mode: "nearest" },
                config: { schemaVersion: "component-v1", formulaReference: "" },
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
          "/payroll/components",
          { code: form.code, name: form.name, type: form.type },
          onSaved,
        )
      }
      title={tText("Component metadata and version")}
    >
      <FieldGrid>
        <TextField form={form} name="code" setForm={setForm} />
        <TextField form={form} name="name" setForm={setForm} />
        <SelectField form={form} name="type" options={["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "REIMBURSEMENT", "INFORMATIONAL"]} setForm={setForm} />
        <TextField form={form} name="componentId" setForm={setForm} />
        <SelectField form={form} name="valueMode" options={["FIXED", "FORMULA_REFERENCE"]} setForm={setForm} />
        <TextField form={form} name="calculationOrder" setForm={setForm} />
        <CheckboxField form={form} name="taxable" setForm={setForm} />
        <CheckboxField form={form} name="statutory" setForm={setForm} />
        <CheckboxField form={form} name="recurring" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
    </FormPanel>
  );
}

function StructureForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    code: "OM_MONTHLY",
    name: "Oman monthly salary",
    currency: "OMR",
    structureId: "",
    versionId: "",
    payComponentVersionId: "",
    fixedAmountMinor: "0",
    calculationOrder: "100",
    effectiveFrom: today,
  });
  return (
    <FormPanel
      action={tText("Create structure")}
      secondary={
        <>
          <InlineAction
            action={tText("Create version")}
            disabled={!form.structureId}
            onClick={() =>
              save(
                "post",
                `/payroll/salary-structures/${form.structureId}/versions`,
                { effectiveFrom: form.effectiveFrom },
                onSaved,
              )
            }
          />
          <InlineAction
            action={tText("Add component")}
            disabled={!form.versionId || !form.payComponentVersionId}
            onClick={() =>
              save(
                "post",
                `/payroll/salary-structures/versions/${form.versionId}/components`,
                {
                  payComponentVersionId: form.payComponentVersionId,
                  fixedAmountMinor: form.fixedAmountMinor,
                  calculationOrder: Number(form.calculationOrder),
                  required: true,
                },
                onSaved,
              )
            }
          />
        </>
      }
      onSubmit={() =>
        save(
          "post",
          "/payroll/salary-structures",
          { code: form.code, name: form.name, currency: form.currency },
          onSaved,
        )
      }
      title={tText("Salary structure and components")}
    >
      <FieldGrid>
        <TextField form={form} name="code" setForm={setForm} />
        <TextField form={form} name="name" setForm={setForm} />
        <TextField form={form} name="currency" setForm={setForm} />
        <TextField form={form} name="structureId" setForm={setForm} />
        <TextField form={form} name="versionId" setForm={setForm} />
        <TextField form={form} name="payComponentVersionId" setForm={setForm} />
        <TextField form={form} name="fixedAmountMinor" setForm={setForm} />
        <TextField form={form} name="calculationOrder" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
    </FormPanel>
  );
}

function EmployeeProfileForm({ current, employeeId, onSaved }: { current: Record<string, unknown> | null; employeeId: string; onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    payGroupId: text(current?.payGroupId, ""),
    payrollCountry: text(current?.payrollCountry, "OM"),
    payrollStatus: text(current?.payrollStatus, "ACTIVE"),
    paymentMethod: text(current?.paymentMethod, "BANK_TRANSFER"),
    salaryHold: Boolean(current?.salaryHold),
    effectiveFrom: text(current?.effectiveFrom, today).slice(0, 10),
    version: text(current?.version, "1"),
  });
  if (!employeeId) return null;
  return (
    <FormPanel
      action={tText(current ? "Save profile" : "Create profile")}
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
      <FieldGrid>
        <TextField form={form} name="payGroupId" setForm={setForm} />
        <TextField form={form} name="payrollCountry" setForm={setForm} />
        <SelectField form={form} name="payrollStatus" options={["ACTIVE", "ON_HOLD", "STOPPED"]} setForm={setForm} />
        <SelectField form={form} name="paymentMethod" options={["BANK_TRANSFER", "CASH", "CHEQUE"]} setForm={setForm} />
        <CheckboxField form={form} name="salaryHold" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
        {current && <TextField form={form} name="version" setForm={setForm} />}
      </FieldGrid>
    </FormPanel>
  );
}

function CompensationForm({ employeeId, onSaved }: { employeeId: string; onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    salaryStructureVersionId: "",
    currency: "OMR",
    amount: "0.000",
    effectiveFrom: today,
    reason: "Payroll Phase 1 compensation revision",
  });
  if (!employeeId) return null;
  return (
    <FormPanel
      action={tText("Create compensation revision")}
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
      <FieldGrid>
        <TextField form={form} name="salaryStructureVersionId" setForm={setForm} />
        <TextField form={form} name="currency" setForm={setForm} />
        <TextField form={form} name="amount" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
        <TextField form={form} name="reason" setForm={setForm} />
      </FieldGrid>
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
        <TextField form={form} name="countryCode" setForm={setForm} />
        <TextField form={form} name="identifierType" setForm={setForm} />
        <TextField form={form} name="identifier" setForm={setForm} />
      </FieldGrid>
    </FormPanel>
  );
}

function ApprovalPolicyForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    name: "Payroll approval",
    approvalPolicyId: "",
    fourEyesEnabled: true,
    makerCanApprove: false,
    requiredLevels: "1",
    allowedPermissions: "payroll.runs.approve",
    allowedRoleKeys: "FINANCE_ADMIN",
    effectiveFrom: today,
  });
  return (
    <FormPanel
      action={tText("Create approval policy")}
      secondary={
        <InlineAction
          action={tText("Create version")}
          disabled={!form.approvalPolicyId}
          onClick={() =>
            save(
              "post",
              `/payroll/approval-policies/${form.approvalPolicyId}/versions`,
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
        />
      }
      onSubmit={() => save("post", "/payroll/approval-policies", { name: form.name }, onSaved)}
      title={tText("Approval policy")}
    >
      <FieldGrid>
        <TextField form={form} name="name" setForm={setForm} />
        <TextField form={form} name="approvalPolicyId" setForm={setForm} />
        <CheckboxField form={form} name="fourEyesEnabled" setForm={setForm} />
        <CheckboxField form={form} name="makerCanApprove" setForm={setForm} />
        <TextField form={form} name="requiredLevels" setForm={setForm} />
        <TextField form={form} name="allowedPermissions" setForm={setForm} />
        <TextField form={form} name="allowedRoleKeys" setForm={setForm} />
        <TextField form={form} name="effectiveFrom" setForm={setForm} type="date" />
      </FieldGrid>
    </FormPanel>
  );
}

function AccountingMappingForm({ onSaved }: { onSaved: () => void }) {
  const { tText } = useTenantLocalization();
  const [form, setForm] = useState<FormState>({
    payComponentId: "",
    debitAccountCode: "",
    creditAccountCode: "",
    costCenterMode: "department",
    effectiveFrom: today,
  });
  return (
    <FormPanel
      action={tText("Create accounting mapping")}
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
        <TextField form={form} name="payComponentId" setForm={setForm} />
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
        body={tText("No records were returned for this Payroll foundation section.")}
        title={tText("No Payroll records yet")}
      />
    );
  }
  const columns = columnsFor(tabKey, rowList);
  return (
    <Panel className="overflow-hidden">
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
    </Panel>
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
  if (!canManage) return <span className="text-xs text-zinc-400">{tText("Read only")}</span>;
  const id = String(row.id ?? "");
  const actions: Array<{ label: string; endpoint: string; method?: "post" | "delete" | "patch"; body?: unknown; confirm?: string }> = [];
  if (tabKey === "calendars") {
    actions.push({ label: tText("Activate"), endpoint: `/payroll/calendars/${id}/activate`, confirm: tText("Activate this calendar version?") });
    actions.push({ label: tText("Deactivate"), endpoint: `/payroll/calendars/${id}/deactivate`, confirm: tText("Deactivate this calendar?") });
  }
  if (tabKey === "components" && row.versions && Array.isArray(row.versions)) {
    const version = row.versions[0] as Record<string, unknown> | undefined;
    if (version?.id) actions.push({ label: tText("Activate latest"), endpoint: `/payroll/components/${id}/versions/${version.id}/activate`, confirm: tText("Activate this component version?") });
  }
  if (tabKey === "structures" && row.versions && Array.isArray(row.versions)) {
    const version = row.versions[0] as Record<string, unknown> | undefined;
    if (version?.id) actions.push({ label: tText("Activate latest"), endpoint: `/payroll/salary-structures/${id}/versions/${version.id}/activate`, confirm: tText("Activate this salary structure version?") });
  }
  if (tabKey === "payment-details") {
    actions.push({ label: tText("Revoke"), endpoint: `/payroll/payment-details/${id}/status`, method: "patch", body: { status: "REVOKED" }, confirm: tText("Revoke this protected payment detail?") });
  }
  if (tabKey === "statutory-details") {
    actions.push({ label: tText("Revoke"), endpoint: `/payroll/statutory-details/${id}/status`, method: "patch", body: { status: "REVOKED" }, confirm: tText("Revoke this protected statutory detail?") });
  }
  if (tabKey === "compensation" && employeeId) {
    actions.push({ label: tText("End today"), endpoint: `/payroll/employees/${employeeId}/compensation/${id}/end`, method: "patch", body: { effectiveTo: today, reason: "Ended from Payroll foundation UI" }, confirm: tText("End this compensation version today?") });
  }
  if (!actions.length) return <span className="text-xs text-zinc-400">{tText("No action")}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          key={action.label}
          onClick={() => {
            if (action.confirm && !window.confirm(tText(action.confirm))) return;
            void save(action.method ?? "post", action.endpoint, action.body ?? {}, onChanged);
          }}
          type="button"
        >
          {action.label}
        </button>
      ))}
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
  onSubmit,
  secondary,
  title,
}: {
  action: string;
  children: React.ReactNode;
  confirm?: string;
  onSubmit: () => Promise<void>;
  secondary?: React.ReactNode;
  title: string;
}) {
  const { tText } = useTenantLocalization();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {secondary}
          <PrimaryButton
            disabled={busy}
            onClick={() => {
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
  onClick,
}: {
  action: string;
  disabled?: boolean;
  onClick: () => Promise<void>;
}) {
  const { tText } = useTenantLocalization();
  return (
    <button
      className="inline-flex h-11 items-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      disabled={disabled}
      onClick={() => void onClick()}
      type="button"
    >
      {tText(action)}
    </button>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function TextField({
  form,
  name,
  setForm,
  type = "text",
}: {
  form: FormState;
  name: string;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  type?: string;
}) {
  const { tText } = useTenantLocalization();
  return (
    <Field label={tText(label(name))}>
      <input
        className={inputClass}
        onChange={(event) =>
          setForm((current) => ({ ...current, [name]: event.target.value }))
        }
        type={type}
        value={String(form[name] ?? "")}
      />
    </Field>
  );
}

function SelectField({
  form,
  name,
  options,
  setForm,
}: {
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
        onChange={(event) =>
          setForm((current) => ({ ...current, [name]: event.target.value }))
        }
        value={String(form[name] ?? "")}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {tText(label(option.toLowerCase()))}
          </option>
        ))}
      </select>
    </Field>
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
    "approval-policies": ["name", "status", "versions"],
    accounting: ["payComponentId", "debitAccountCode", "creditAccountCode", "status", "version"],
    audit: ["action", "entityType", "entityId", "actorUserId", "createdAt"],
  };
  const selected = preferred[tabKey] ?? [];
  const available = new Set(rowList.flatMap((row) => Object.keys(row)));
  const columns = selected.filter((column) => available.has(column));
  return columns.length ? columns : Array.from(available).slice(0, 8);
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
    response?: { data?: { message?: string; code?: string } };
    message?: string;
  };
  const code = response.response?.data?.code;
  const message = response.response?.data?.message ?? response.message;
  if (code === "VERSION_CONFLICT") {
    return t("Version conflict. Refresh the section and retry with the latest version.");
  }
  return message ?? t("Payroll request failed.");
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
