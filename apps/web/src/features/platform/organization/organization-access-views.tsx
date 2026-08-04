"use client";

import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileUp,
  Info,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  WalletCards,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { phoneCountryForTenant } from "@/lib/phone-country";
import { InternationalPhoneInput } from "@/shared/components/international-phone-input";
import type { CountryCode } from "libphonenumber-js";
import {
  AdminPage,
  DataTable,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
  EmptyState,
  ErrorState,
  Field,
  FilterField,
  LoadingState,
  Panel,
  PaginationBar,
  PrimaryButton,
  StepList,
  StatusBadge,
  Toolbar,
  inputClass,
} from "@/shared/components/page-primitives";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { tenantMessage } from "@/i18n/tenant-message";

type Department = {
  id: string;
  name: string;
  parentDeptId?: string;
  children?: Department[];
  _count?: { employees: number };
};
type Designation = { id: string; name: string; employeeCount?: number };
type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  phone?: string;
  workType: string;
  status: string;
  department?: Department;
  designation?: Designation;
  manager?: { id: string; fullName: string };
  user?: { id: string; email: string; status: string } | null;
  officeAssignments?: Array<{
    office: { id: string; officeName: string; timezone?: string | null };
  }>;
};
type PayrollPayGroup = {
  id: string;
  code?: string;
  name: string;
};
type EmployeePayrollProfile = {
  id?: string;
  employeeId?: string;
  payGroupId?: string | null;
  salaryHold?: boolean | null;
  paymentMethod?: string | null;
  status?: string | null;
};
type EmployeePage = {
  data: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function employeeStatusTone(status: string) {
  if (status === "ACTIVE") return "success";
  if (status === "ON_NOTICE") return "warning";
  if (status === "TERMINATED") return "neutral";
  return "info";
}

function payrollStatus(profile?: EmployeePayrollProfile | null) {
  if (!profile) {
    return {
      label: "Missing setup",
      tone: "danger" as const,
    };
  }
  if (!profile.payGroupId) {
    return {
      label: "Missing pay group",
      tone: "warning" as const,
    };
  }
  if (profile.salaryHold) {
    return {
      label: "On hold",
      tone: "warning" as const,
    };
  }
  return {
    label: "Ready",
    tone: "success" as const,
  };
}

function importStatusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("COMPLETE") || normalized.includes("SUCCESS"))
    return "success";
  if (normalized.includes("FAIL") || normalized.includes("ERROR"))
    return "danger";
  if (normalized.includes("VALID") || normalized.includes("PROCESS"))
    return "info";
  return "neutral";
}

const EMPLOYEE_ONBOARDING_STEPS = [
  {
    number: "1",
    title: tenantMessage("Create profile"),
    body: tenantMessage("Add identity, joining details, department and designation."),
  },
  {
    number: "2",
    title: tenantMessage("Set attendance"),
    body: tenantMessage("Assign a primary office, working shift and attendance policy."),
  },
  {
    number: "3",
    title: tenantMessage("Enable access"),
    body: tenantMessage("Invite the employee and approve a device when the policy requires it."),
  },
] as const;
type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissionKeys?: string[];
  assignedUsers?: number;
};
type User = {
  id: string;
  email: string;
  status: string;
  roles: Role[];
  employee?: { id: string; employeeCode: string; fullName: string } | null;
};

const SYSTEM_ROLE_SUMMARIES: Record<string, string> = {
  BUSINESS_ADMIN:
    "Full workspace, access, billing, settings and module administration.",
  HR_ADMIN:
    "Employee, organization, attendance, leave, device and report operations.",
  MANAGER: "Reporting-team visibility, attendance reviews and leave approvals.",
};

function apiErrorMessage(error: unknown, fallback: string) {
  const response = error as {
    response?: { data?: { message?: string | string[] } };
  };
  const message = response.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}

function flattenDepartments(
  departments: Department[],
  depth = 0,
): Array<Department & { depth: number }> {
  return departments.flatMap((department) => [
    { ...department, depth },
    ...flattenDepartments(department.children ?? [], depth + 1),
  ]);
}

const ROLE_PRESETS = [
  {
    id: "employee",
    name: tenantMessage("Employee self-service"),
    description: tenantMessage("Own profile, attendance, leave and notifications only."),
    keys: [
      "organization.employees.self.read",
      "attendance.records.self.read",
      "attendance.regularizations.self",
      "leave.self",
      "notifications.self",
      "mobile.runtime.read",
    ],
  },
  {
    id: "manager",
    name: tenantMessage("Team manager"),
    description: tenantMessage("Employee access plus team attendance and leave approvals."),
    keys: [
      "organization.employees.self.read",
      "attendance.records.self.read",
      "attendance.regularizations.self",
      "leave.self",
      "notifications.self",
      "mobile.runtime.read",
      "organization.employees.read",
      "attendance.records.read",
      "attendance.approvals.manage",
      "attendance.regularizations.manage",
      "leave.approve",
    ],
  },
] as const;

const PERMISSION_ACTIONS: Record<string, string> = {
  approve: "Approve",
  create: "Create",
  delete: "Delete",
  generate: "Generate",
  invite: "Invite",
  manage: "Manage",
  read: "View",
  self: "Use own",
  update: "Edit",
};

function sentenceCase(value: string) {
  const text = value.replaceAll("-", " ").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describePermission(key: string) {
  const parts = key.split(".");
  const moduleName = parts[0] ?? "workspace";
  const action = parts.at(-1) ?? "read";
  const resourceParts = parts.slice(1, -1);
  if (action === "self" || resourceParts.at(-1) === "self") {
    const resource = resourceParts.filter((part) => part !== "self").join(" ");
    return {
      title: `Use own ${resource || moduleName}`,
      description: tenantMessage("Only the signed-in employee's own information and actions."),
    };
  }
  const resource = resourceParts.join(" ") || moduleName;
  const verb = PERMISSION_ACTIONS[action] ?? sentenceCase(action);
  return {
    title: `${verb} ${resource}`,
    description:
      action === "read"
        ? `Can view ${resource}; cannot change it.`
        : `Can ${verb.toLowerCase()} ${resource} for authorized employees.`,
  };
}

type EmployeeImportSchema = {
  format: "CSV";
  encoding: string;
  maxFileSizeBytes: number;
  maxRows: number;
  fields: Array<{
    key: string;
    label: string;
    required: boolean;
    format: string;
    example: string;
  }>;
  templateCsv: string;
  notes: string[];
};

type EmployeeImportError = {
  rowNumber: number;
  employeeCode?: string | null;
  errorCode: string;
  errorMessage: string;
};

export function OrganizationView({
  embedded = false,
  onReadinessChange,
}: {
  embedded?: boolean;
  onReadinessChange?: (ready: boolean) => void;
} = {}) {
  const { tText } = useTenantLocalization();
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [error, setError] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentParentId, setDepartmentParentId] = useState("");
  const [designationName, setDesignationName] = useState("");
  const onReadinessChangeRef = useRef(onReadinessChange);
  useEffect(() => {
    onReadinessChangeRef.current = onReadinessChange;
  }, [onReadinessChange]);
  const load = useCallback(
    () =>
      Promise.all([
        apiClient.get("/departments?view=tree"),
        apiClient.get("/designations?limit=100"),
      ])
        .then(([departmentResult, designationResult]) => {
          const nextDepartments = departmentResult.data.data as Department[];
          const nextDesignations = designationResult.data.data as Designation[];
          setDepartments(nextDepartments);
          setDesignations(nextDesignations);
          onReadinessChangeRef.current?.(
            nextDepartments.length > 0 && nextDesignations.length > 0,
          );
          setError("");
        })
        .catch(() => {
          onReadinessChangeRef.current?.(false);
          setError(tText("Organization structure could not be loaded."));
        }),
    [tText],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function addDepartment() {
    await apiClient
      .post("/departments", {
        name: departmentName,
        parentDeptId: departmentParentId || undefined,
      })
      .then(() => {
        setDepartmentName("");
        setDepartmentParentId("");
        return load();
      })
      .catch((caught) =>
        setError(
          apiErrorMessage(
            caught,
            "Department could not be created at this level.",
          ),
        ),
      );
  }
  async function addDesignation() {
    await apiClient
      .post("/designations", { name: designationName })
      .then(() => {
        setDesignationName("");
        return load();
      })
      .catch((caught) =>
        setError(apiErrorMessage(caught, "Designation could not be created.")),
      );
  }
  async function renameDepartment(id: string, name: string) {
    await apiClient
      .patch(`/departments/${id}`, { name })
      .then(() => load())
      .catch((caught) =>
        setError(apiErrorMessage(caught, "Department could not be renamed.")),
      );
  }
  async function moveDepartment(id: string, parentDeptId: string | null) {
    await apiClient
      .patch(`/departments/${id}`, { parentDeptId })
      .then(() => load())
      .catch((caught) =>
        setError(apiErrorMessage(caught, "Department could not be moved.")),
      );
  }
  async function addChildDepartment(parentDeptId: string, name: string) {
    await apiClient
      .post("/departments", { name, parentDeptId })
      .then(() => load())
      .catch((caught) =>
        setError(
          apiErrorMessage(caught, "Child department could not be created."),
        ),
      );
  }
  async function deleteDepartment(id: string) {
    await apiClient
      .delete(`/departments/${id}`)
      .then(() => load())
      .catch((caught) =>
        setError(
          apiErrorMessage(
            caught,
            "Move employees and child departments before deleting this department.",
          ),
        ),
      );
  }
  async function renameDesignation(id: string, name: string) {
    await apiClient
      .patch(`/designations/${id}`, { name })
      .then(() => load())
      .catch((caught) =>
        setError(apiErrorMessage(caught, "Designation could not be renamed.")),
      );
  }
  async function deleteDesignation(id: string) {
    await apiClient
      .delete(`/designations/${id}`)
      .then(() => load())
      .catch((caught) =>
        setError(
          apiErrorMessage(
            caught,
            "Reassign employees before deleting this designation.",
          ),
        ),
      );
  }
  const departmentOptions = flattenDepartments(departments ?? []);
  const showSetupHint = !embedded;
  return (
    <AdminPage
      title={tText("Organization Builder")}
      description={tText("Build department hierarchy and maintain reusable designations.")}
    >
      {error && <ErrorState message={error} />}
      {!departments ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6">
          {showSetupHint && (
            <Panel className="flex flex-wrap items-center gap-4 border-zinc-200 bg-zinc-50 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-[#151515]">
                <Info className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">
                  {tText("Organization comes before workplace setup")}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {tText("Departments and designations describe employee structure. The next step defines the physical office and attendance geofence.")}
                </p>
              </div>
              <Link
                className="inline-flex h-10 items-center rounded-lg bg-[#151515] px-4 text-sm font-semibold text-white"
                href="/app/attendance/offices"
              >
                {tText("Continue to office setup")}
              </Link>
            </Panel>
          )}
          <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <Panel className="p-7">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{tText("Departments")}</h2>
                <Building2 className="text-[#151515]" />
              </div>
              <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
                <input
                  className={inputClass}
                  placeholder={tText("New department")}
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                />
                <select
                  aria-label={tText("Parent department")}
                  className={inputClass}
                  onChange={(event) =>
                    setDepartmentParentId(event.target.value)
                  }
                  value={departmentParentId}
                >
                  <option value="">{tText("Top-level department")}</option>
                  {departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {"— ".repeat(department.depth)}
                      {department.name}
                    </option>
                  ))}
                </select>
                <PrimaryButton
                  disabled={departmentName.trim().length < 2}
                  onClick={addDepartment}
                >
                  <Plus className="size-4" />
                  {tText("Add")}</PrimaryButton>
              </div>
              <div className="grid gap-3">
                {departments.map((department) => (
                  <DepartmentNode
                    allDepartments={departmentOptions}
                    department={department}
                    key={department.id}
                    onAddChild={addChildDepartment}
                    onDelete={deleteDepartment}
                    onMove={moveDepartment}
                    onRename={renameDepartment}
                  />
                ))}
                {!departments.length && (
                  <EmptyState
                    title={tText("No departments")}
                    body={tText("Create your first department to start organizing employees.")}
                  />
                )}
              </div>
            </Panel>
            <Panel className="p-7">
              <h2 className="mb-6 text-xl font-semibold">{tText("Designations")}</h2>
              <div className="mb-5 flex gap-3">
                <input
                  className={inputClass}
                  placeholder={tText("New designation")}
                  value={designationName}
                  onChange={(e) => setDesignationName(e.target.value)}
                />
                <PrimaryButton
                  disabled={designationName.trim().length < 2}
                  onClick={addDesignation}
                >
                  <Plus className="size-4" />
                  {tText("Add")}</PrimaryButton>
              </div>
              <div className="grid gap-2">
                {designations.map((designation) => (
                  <DesignationRow
                    designation={designation}
                    key={designation.id}
                    onDelete={deleteDesignation}
                    onRename={renameDesignation}
                  />
                ))}
                {!designations.length && (
                  <EmptyState
                    body={tText("Create job titles that can be assigned to employees.")}
                    title={tText("No designations")}
                  />
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function DepartmentNode({
  department,
  allDepartments,
  onAddChild,
  onDelete,
  onMove,
  onRename,
  depth = 0,
}: {
  department: Department;
  allDepartments: Array<Department & { depth: number }>;
  onAddChild: (parentId: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, parentId: string | null) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  depth?: number;
}) {
  const { tText } = useTenantLocalization();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(department.name);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const descendants = new Set(
    flattenDepartments(department.children ?? []).map(({ id }) => id),
  );
  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-variant bg-white px-4 py-3"
        style={{ marginLeft: depth * 24 }}
      >
        <div className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-[#151515]">
          <Building2 className="size-4" />
        </div>
        {editing ? (
          <input
            aria-label={`Rename ${department.name}`}
            autoFocus
            className={`${inputClass} min-w-48 flex-1`}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        ) : (
          <span className="min-w-36 flex-1 font-medium">{department.name}</span>
        )}
        {editing ? (
          <>
            <select
              aria-label={`Parent for ${department.name}`}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-xs"
              onChange={(event) =>
                void onMove(department.id, event.target.value || null)
              }
              value={department.parentDeptId ?? ""}
            >
              <option value="">{tText("Top level")}</option>
              {allDepartments
                .filter(
                  ({ id }) => id !== department.id && !descendants.has(id),
                )
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {"— ".repeat(option.depth)}
                    {option.name}
                  </option>
                ))}
            </select>
            <button
              className="text-xs font-bold text-[#151515]"
              disabled={name.trim().length < 2}
              onClick={async () => {
                await onRename(department.id, name);
                setEditing(false);
              }}
              type="button"
            >
              {tText("Save")}</button>
            <button
              className="text-xs text-muted-foreground"
              onClick={() => {
                setName(department.name);
                setEditing(false);
              }}
              type="button"
            >
              {tText("Cancel")}</button>
          </>
        ) : (
          <>
            <button
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-50"
              onClick={() => setAddingChild((current) => !current)}
              title={tText("Add child department")}
              type="button"
            >
              <Plus className="size-4" />
            </button>
            <button
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-50"
              onClick={() => setEditing(true)}
              title={tText("Edit department")}
              type="button"
            >
              <Pencil className="size-4" />
            </button>
            <button
              className="rounded-lg p-2 text-red-700 hover:bg-red-50"
              onClick={() => {
                if (window.confirm(`Delete ${department.name}?`)) {
                  void onDelete(department.id);
                }
              }}
              title={tText("Delete department")}
              type="button"
            >
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
      {addingChild && (
        <div
          className="mt-2 flex gap-2 rounded-lg bg-zinc-50 p-3"
          style={{ marginLeft: (depth + 1) * 24 }}
        >
          <input
            aria-label={`New department under ${department.name}`}
            autoFocus
            className={inputClass}
            onChange={(event) => setChildName(event.target.value)}
            placeholder={`Team under ${department.name}`}
            value={childName}
          />
          <PrimaryButton
            disabled={childName.trim().length < 2}
            onClick={async () => {
              await onAddChild(department.id, childName);
              setChildName("");
              setAddingChild(false);
            }}
          >
            {tText("Add")}</PrimaryButton>
        </div>
      )}
      {department.children?.map((child) => (
        <DepartmentNode
          allDepartments={allDepartments}
          department={child}
          depth={depth + 1}
          key={child.id}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onMove={onMove}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

function DesignationRow({
  designation,
  onDelete,
  onRename,
}: {
  designation: Designation;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const { tText } = useTenantLocalization();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(designation.name);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-4 py-3">
      {editing ? (
        <input
          aria-label={`Rename ${designation.name}`}
          autoFocus
          className={`${inputClass} flex-1`}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      ) : (
        <span className="flex-1 text-sm font-medium">{designation.name}</span>
      )}
      <span className="whitespace-nowrap text-xs text-outline">
        {designation.employeeCount ?? 0} {tText("employees")}</span>
      {editing ? (
        <>
          <button
            className="text-xs font-bold text-[#151515]"
            disabled={name.trim().length < 2}
            onClick={async () => {
              await onRename(designation.id, name);
              setEditing(false);
            }}
            type="button"
          >
            {tText("Save")}</button>
          <button
            className="text-xs text-muted-foreground"
            onClick={() => {
              setName(designation.name);
              setEditing(false);
            }}
            type="button"
          >
            {tText("Cancel")}</button>
        </>
      ) : (
        <>
          <button
            className="rounded-lg p-2 text-zinc-500 hover:bg-white"
            onClick={() => setEditing(true)}
            title={tText("Edit designation")}
            type="button"
          >
            <Pencil className="size-4" />
          </button>
          <button
            className="rounded-lg p-2 text-red-700 hover:bg-red-50"
            onClick={() => {
              if (window.confirm(`Delete ${designation.name}?`)) {
                void onDelete(designation.id);
              }
            }}
            title={tText("Delete designation")}
            type="button"
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function EmployeesView() {
  const { tText } = useTenantLocalization();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [result, setResult] = useState<EmployeePage | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [moduleKeys, setModuleKeys] = useState<Set<string>>(new Set());
  const [payGroups, setPayGroups] = useState<PayrollPayGroup[]>([]);
  const [payrollProfiles, setPayrollProfiles] = useState<
    Record<string, EmployeePayrollProfile | null>
  >({});
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const payrollEnabled = moduleKeys.has("PAYROLL");
  useEffect(() => {
    const employeeParams = new URLSearchParams(query);
    employeeParams.delete("payGroupId");
    const employeeQuery = employeeParams.toString() || "page=1&limit=25";
    apiClient
      .get(`/employees?${employeeQuery}`)
      .then(({ data }) => {
        setResult({
          data: data.data,
          pagination: data.pagination,
        });
        setError("");
      })
      .catch(() => setError(tText("Employees could not be loaded.")));
  }, [query]);
  useEffect(() => {
    apiClient
      .get<{ modules: Array<{ key: string }> }>("/workspace/modules")
      .then(({ data }) =>
        setModuleKeys(new Set(data.modules.map(({ key }) => key))),
      )
      .catch(() => setModuleKeys(new Set()));
  }, []);
  useEffect(() => {
    if (!payrollEnabled) {
      setPayGroups([]);
      setPayrollProfiles({});
      return;
    }
    let active = true;
    apiClient
      .get("/payroll/pay-groups")
      .then(({ data }) => {
        if (!active) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        setPayGroups(
          list
            .map((item: Record<string, unknown>) => ({
              id: String(item.id ?? ""),
              code: item.code ? String(item.code) : undefined,
              name: String(item.name ?? item.code ?? "Unnamed pay group"),
            }))
            .filter((item: PayrollPayGroup) => item.id),
        );
      })
      .catch(() => {
        if (active) setPayGroups([]);
      });
    return () => {
      active = false;
    };
  }, [payrollEnabled]);
  function updateQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/app/employees?${next.toString()}`);
  }
  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    updateQuery({ search: search.trim() || null, page: "1" });
  }
  const data = result?.data ?? null;
  const employeeIdsKey = data?.map((employee) => employee.id).join(",") ?? "";
  useEffect(() => {
    const employees = data ?? [];
    if (!payrollEnabled || !employees.length) {
      setPayrollProfiles({});
      return;
    }
    let active = true;
    Promise.allSettled(
      employees.map((employee) =>
        apiClient.get(`/payroll/employees/${employee.id}/profile`),
      ),
    ).then((responses) => {
      if (!active) return;
      const next: Record<string, EmployeePayrollProfile | null> = {};
      responses.forEach((response, index) => {
        const employeeId = employees[index]?.id;
        if (!employeeId) return;
        if (response.status === "fulfilled") {
          const profile = response.value.data?.data ?? response.value.data;
          next[employeeId] = profile
            ? {
                id: profile.id ? String(profile.id) : undefined,
                employeeId,
                payGroupId: profile.payGroupId
                  ? String(profile.payGroupId)
                  : null,
                salaryHold: Boolean(profile.salaryHold),
                paymentMethod: profile.paymentMethod
                  ? String(profile.paymentMethod)
                  : null,
                status: profile.status ? String(profile.status) : null,
              }
            : null;
          return;
        }
        next[employeeId] = null;
      });
      setPayrollProfiles(next);
    });
    return () => {
      active = false;
    };
  }, [data, employeeIdsKey, payrollEnabled]);
  const selectedPayGroupId = searchParams.get("payGroupId") ?? "";
  const payGroupNameById = new Map(
    payGroups.map((payGroup) => [payGroup.id, payGroup.name]),
  );
  const visibleEmployees =
    payrollEnabled && selectedPayGroupId
      ? data?.filter(
          (employee) =>
            payrollProfiles[employee.id]?.payGroupId === selectedPayGroupId,
        ) ?? null
      : data;
  return (
    <AdminPage
      title={tText("Employees")}
      description={tText("Manage workforce records, reporting relationships and lifecycle status.")}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-label={tText("How employee onboarding works")}
            className="grid size-11 place-items-center rounded-xl border border-zinc-300 bg-white text-zinc-600 transition hover:border-[#151515] hover:bg-zinc-50 hover:text-[#151515]"
            onClick={() => setOnboardingOpen(true)}
            title={tText("How employee onboarding works")}
            type="button"
          >
            <Info className="size-5" />
          </button>
          <Link
            className="inline-flex h-11 items-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-[#151515] hover:bg-zinc-50"
            href="/app/imports/employees"
          >
            <FileUp className="mr-2 size-4" />
            {tText("Import employees")}</Link>
          <Link href="/app/employees/new">
            <PrimaryButton>
              <UserRoundPlus className="size-4" />
              {tText("Add employee")}</PrimaryButton>
          </Link>
          {payrollEnabled && permissions.includes("payroll.runs.read") && (
            <Link
              className="inline-flex h-11 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
              href="/app/payroll/runs"
            >
              <Banknote className="mr-2 size-4" />
              {tText("Run payroll")}
            </Link>
          )}
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <div>
          {payrollEnabled && (
            <div className="mb-5 grid gap-4 lg:grid-cols-3">
              <Link
                className="group rounded-[6px] border border-[#c9eadb] bg-[#f1fbf6] p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-[#151515] hover:bg-[#fffefa]"
                href="/app/payroll/runs"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-[5px] border border-[#c9eadb] bg-[#fffefa] text-[#151515] shadow-sm">
                    <Banknote className="size-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{tText("Run payroll")}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {tText("Choose a pay group, calculate salaries, approve, and generate payslips.")}
                    </span>
                  </span>
                </div>
              </Link>
              <Link
                className="group rounded-[6px] border border-[#ded5f2] bg-[#f7f4ff] p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-[#151515] hover:bg-[#fffefa]"
                href="/app/modules/payroll/payslips"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-[5px] border border-[#ded5f2] bg-[#fffefa] text-[#151515]">
                    <WalletCards className="size-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{tText("Payslips")}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {tText("Publish payslips after salary approval.")}
                    </span>
                  </span>
                </div>
              </Link>
              <Link
                className="group rounded-[6px] border border-[#f0dfb8] bg-[#fff9ec] p-5 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-[#151515] hover:bg-[#fffefa]"
                href="/app/reports?type=PAYROLL"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-[5px] border border-[#f0dfb8] bg-[#fffefa] text-[#151515]">
                    <ClipboardCheck className="size-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{tText("Payroll reports")}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {tText("Download payroll register, bank, and accounting outputs.")}
                    </span>
                  </span>
                </div>
              </Link>
            </div>
          )}
          <Panel className="overflow-hidden">
            <Toolbar className="rounded-none border-x-0 border-t-0 shadow-none">
              <div className="grid w-full items-end gap-3 lg:grid-cols-[minmax(320px,1fr)_170px_190px_170px_132px]">
                <form className="grid gap-1.5" onSubmit={submitSearch}>
                  <FilterField label={tText("Search employees")}>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        aria-label={tText("Search employees")}
                        className={`${inputClass} pl-10`}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={tText("Name, code, email, office or department")}
                        value={search}
                      />
                    </div>
                    <button
                      className="h-11 rounded-xl bg-[#151515] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
                      type="submit"
                    >
                      {tText("Search")}</button>
                  </div>
                  </FilterField>
                </form>
                <FilterField label={tText("Status")}>
                  <select
                    aria-label={tText("Filter employee status")}
                    className={inputClass}
                    onChange={(event) =>
                      updateQuery({
                        status: event.target.value || null,
                        page: "1",
                      })
                    }
                    value={searchParams.get("status") ?? ""}
                  >
                    <option value="">{tText("All statuses")}</option>
                    <option value="ACTIVE">{tText("Active")}</option>
                    <option value="ON_NOTICE">{tText("On notice")}</option>
                    <option value="TERMINATED">{tText("Terminated")}</option>
                  </select>
                </FilterField>
                {payrollEnabled && (
                  <FilterField label={tText("Pay group")}>
                    <select
                      aria-label={tText("Filter by pay group")}
                      className={inputClass}
                      onChange={(event) =>
                        updateQuery({
                          payGroupId: event.target.value || null,
                          page: "1",
                        })
                      }
                      value={selectedPayGroupId}
                    >
                      <option value="">{tText("All pay groups")}</option>
                      {payGroups.map((payGroup) => (
                        <option key={payGroup.id} value={payGroup.id}>
                          {payGroup.name}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                )}
                <FilterField label={tText("Sort by")}>
                  <select
                    aria-label={tText("Sort employees")}
                    className={inputClass}
                    onChange={(event) =>
                      updateQuery({ sort: event.target.value, page: "1" })
                    }
                    value={searchParams.get("sort") ?? "name_asc"}
                  >
                    <option value="name_asc">{tText("Name A–Z")}</option>
                    <option value="name_desc">{tText("Name Z–A")}</option>
                    <option value="code_asc">{tText("Code ascending")}</option>
                    <option value="joined_desc">{tText("Newest joined")}</option>
                  </select>
                </FilterField>
                <FilterField label={tText("Show")}>
                  <select
                    aria-label={tText("Rows per page")}
                    className={inputClass}
                    onChange={(event) =>
                      updateQuery({ limit: event.target.value, page: "1" })
                    }
                    value={searchParams.get("limit") ?? "25"}
                  >
                    <option value="25">{tText("25 rows")}</option>
                    <option value="50">{tText("50 rows")}</option>
                    <option value="100">{tText("100 rows")}</option>
                  </select>
                </FilterField>
              </div>
            </Toolbar>
            <DataTable className="rounded-none border-x-0 border-t-0 shadow-none" minWidth={payrollEnabled ? "1380px" : "1180px"}>
                <DataTableHeader>
                  <tr>
                    <DataTableHeadCell>{tText("Employee")}</DataTableHeadCell>
                    <DataTableHeadCell>{tText("Code")}</DataTableHeadCell>
                    <DataTableHeadCell>{tText("Email")}</DataTableHeadCell>
                    <DataTableHeadCell>{tText("Office")}</DataTableHeadCell>
                    <DataTableHeadCell>{tText("Department")}</DataTableHeadCell>
                    <DataTableHeadCell>{tText("Designation")}</DataTableHeadCell>
                    <DataTableHeadCell>{tText("Manager")}</DataTableHeadCell>
                    <DataTableHeadCell>{tText("Work type")}</DataTableHeadCell>
                    {payrollEnabled && (
                      <>
                        <DataTableHeadCell>{tText("Pay group")}</DataTableHeadCell>
                        <DataTableHeadCell>{tText("Payroll status")}</DataTableHeadCell>
                      </>
                    )}
                    <DataTableHeadCell>{tText("Status")}</DataTableHeadCell>
                  </tr>
                </DataTableHeader>
                <tbody>
                  {(visibleEmployees ?? []).map((employee) => {
                    const profile = payrollProfiles[employee.id];
                    const status = payrollStatus(profile);
                    const payGroupName = profile?.payGroupId
                      ? payGroupNameById.get(profile.payGroupId) ?? tText("Pay group not found")
                      : tText("No pay group");
                    return (
                      <DataTableRow key={employee.id}>
                        <DataTableCell>
                          <Link
                            href={`/app/employees/${employee.id}`}
                            className="font-semibold text-[#151515] hover:underline"
                          >
                            {employee.fullName}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {employee.phone || tText("No phone")}
                          </div>
                        </DataTableCell>
                        <DataTableCell>{employee.employeeCode}</DataTableCell>
                        <DataTableCell>{employee.user?.email || "-"}</DataTableCell>
                        <DataTableCell>
                          {employee.officeAssignments?.[0]?.office.officeName ||
                            "-"}
                        </DataTableCell>
                        <DataTableCell>{employee.department?.name || "-"}</DataTableCell>
                        <DataTableCell>{employee.designation?.name || "-"}</DataTableCell>
                        <DataTableCell>{employee.manager?.fullName || "-"}</DataTableCell>
                        <DataTableCell>{employee.workType}</DataTableCell>
                        {payrollEnabled && (
                          <>
                            <DataTableCell>{payGroupName}</DataTableCell>
                            <DataTableCell>
                              <StatusBadge tone={status.tone}>
                                {tText(status.label)}
                              </StatusBadge>
                            </DataTableCell>
                          </>
                        )}
                        <DataTableCell>
                          <StatusBadge tone={employeeStatusTone(employee.status)}>
                            {employee.status}
                          </StatusBadge>
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </tbody>
            </DataTable>
            {!visibleEmployees?.length && (
              <EmptyState
                title={
                  selectedPayGroupId
                    ? tText("No employees in this pay group")
                    : tText("No employees")
                }
                body={
                  selectedPayGroupId
                    ? tText("Choose another pay group or update the employee payroll setup.")
                    : tText("Add employees individually or use the bulk import wizard.")
                }
              />
            )}
            {result && result.pagination.total > 0 && (
              <PaginationBar
                canNext={result.pagination.page < result.pagination.totalPages}
                canPrevious={result.pagination.page > 1}
                label={
                  <>
                    {tText("Showing")} {((result.pagination.page - 1) * result.pagination.limit) + 1}-
                    {Math.min(
                      result.pagination.page * result.pagination.limit,
                      result.pagination.total,
                    )} {tText("of")} {result.pagination.total} {tText("employees")}
                  </>
                }
                nextLabel={tText("Next")}
                onNext={() =>
                  updateQuery({ page: String(result.pagination.page + 1) })
                }
                onPrevious={() =>
                  updateQuery({ page: String(result.pagination.page - 1) })
                }
                pageLabel={
                  <>
                    {tText("Page")} {result.pagination.page} {tText("of")} {result.pagination.totalPages}
                  </>
                }
                previousLabel={tText("Previous")}
              />
            )}
          </Panel>
        </div>
      )}
      {onboardingOpen && (
        <AccessDialog
          title={tText("How employee onboarding works")}
          onClose={() => setOnboardingOpen(false)}
        >
          <ol className="grid gap-3">
            {EMPLOYEE_ONBOARDING_STEPS.map(({ number, title, body }) => (
              <li
                className="flex gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                key={number}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#151515] text-sm font-bold text-white">
                  {number}
                </span>
                <span>
                  <strong className="block text-sm">{tText(title)}</strong>
                  <span className="mt-1 block text-xs leading-5 text-outline">
                    {tText(body)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#151515] px-4 text-sm font-bold text-white"
            href="/app/employees/new"
          >
            {tText("Add an employee")}</Link>
        </AccessDialog>
      )}
    </AdminPage>
  );
}

export function EmployeeEditorView() {
  const { tText } = useTenantLocalization();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [defaultPhoneCountry, setDefaultPhoneCountry] =
    useState<CountryCode>("IN");
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState<{
    employeeId: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    phone: "",
    workType: "OFFICE",
    dateOfBirth: "",
    dateOfJoining: new Date().toISOString().slice(0, 10),
    deptId: "",
    designationId: "",
  });
  useEffect(() => {
    Promise.all([
      apiClient.get("/departments"),
      apiClient.get("/designations?limit=100"),
      apiClient.get("/employees/next-code"),
      apiClient
        .get("/tenant-settings")
        .catch(() => ({ data: { data: null } })),
    ])
      .then(
        ([
          departmentResult,
          designationResult,
          codeResult,
          settingsResult,
        ]) => {
          setDepartments(departmentResult.data.data);
          setDesignations(designationResult.data.data);
          setDefaultPhoneCountry(
            phoneCountryForTenant({
              timezone: settingsResult.data.data?.timezone,
              locale: settingsResult.data.data?.locale,
            }),
          );
          setForm((value) => ({
            ...value,
            employeeCode:
              codeResult.data.data?.employeeCode ??
              codeResult.data.employeeCode ??
              "",
          }));
        },
      )
      .catch(() => setError(tText("Employee form options could not be loaded.")));
  }, []);
  async function save() {
    setError("");
    if (
      !form.employeeCode.trim() ||
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.dateOfBirth ||
      !form.deptId
    ) {
      setError(
        tText("Employee code, full name, work email, phone, date of birth and department are required."),
      );
      return;
    }
    await apiClient
      .post("/employees", {
        ...form,
        phone: form.phone || undefined,
        designationId: form.designationId || undefined,
      })
      .then(({ data }) => {
        const employeeId = data.data?.id ?? data.id;
        const credentials = data.temporaryCredentials;
        if (employeeId && credentials?.email && credentials?.password) {
          setCreatedAccount({ employeeId, ...credentials });
          return;
        }
        router.push(
          employeeId
            ? `/app/employees/${employeeId}?setup=1`
            : "/app/employees",
        );
      })
      .catch(() =>
        setError(
          tText("Employee could not be created. Review code, phone and organization fields."),
        ),
      );
  }
  return (
    <AdminPage
      title={tText("Add Employee")}
      description={tText("Create a secure employee record and reporting placement.")}
      action={<PrimaryButton onClick={save}>{tText("Create employee")}</PrimaryButton>}
    >
      {error && <ErrorState message={error} />}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel className="p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={tText("Employee code")}>
              <input
                className={inputClass}
                value={form.employeeCode}
                onChange={(e) =>
                  setForm({ ...form, employeeCode: e.target.value })
                }
              />
            </Field>
            <Field label={tText("Full name")}>
              <input
                className={inputClass}
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label={tText("Phone")}>
              <InternationalPhoneInput
                defaultCountry={defaultPhoneCountry}
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
              />
              <p className="mt-2 text-xs leading-5 text-outline">
                {tText("Select the country code, then enter the local mobile number.")}</p>
            </Field>
            <Field label={tText("Work email")}>
              <input
                className={inputClass}
                placeholder={tText("employee@company.com")}
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <p className="mt-2 text-xs leading-5 text-outline">
                {tText("This becomes the employee&apos;s app login email.")}</p>
            </Field>
            <Field label={tText("Date of joining")}>
              <input
                type="date"
                className={inputClass}
                value={form.dateOfJoining}
                onChange={(e) =>
                  setForm({ ...form, dateOfJoining: e.target.value })
                }
              />
            </Field>
            <Field label={tText("Date of birth")}>
              <input
                type="date"
                className={inputClass}
                required
                max={new Date().toISOString().slice(0, 10)}
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm({ ...form, dateOfBirth: e.target.value })
                }
              />
            </Field>
            <Field label={tText("Department")}>
              <select
                className={inputClass}
                value={form.deptId}
                onChange={(e) => setForm({ ...form, deptId: e.target.value })}
              >
                <option value="">{tText("Select department")}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tText("Designation")}>
              <select
                className={inputClass}
                value={form.designationId}
                onChange={(e) =>
                  setForm({ ...form, designationId: e.target.value })
                }
              >
                <option value="">{tText("No designation")}</option>
                {designations.map((designation) => (
                  <option key={designation.id} value={designation.id}>
                    {designation.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tText("Work type")}>
              <select
                className={inputClass}
                value={form.workType}
                onChange={(e) => setForm({ ...form, workType: e.target.value })}
              >
                <option value="OFFICE">{tText("Office")}</option>
                <option value="FIELD">{tText("Field")}</option>
                <option value="HYBRID">{tText("Hybrid")}</option>
              </select>
              <p className="mt-2 text-xs leading-5 text-outline">
                {form.workType === "OFFICE"
                  ? tText("Office employees normally check in at an assigned workplace and do not use continuous field tracking.")
                  : form.workType === "FIELD"
                    ? tText("Field employees can use field GPS and route tracking when those Attendance features are enabled.")
                    : tText("Hybrid employees can use office or field attendance rules based on their assigned policy and schedule.")}
              </p>
            </Field>
          </div>
        </Panel>
        <Panel className="p-7">
          <div className="grid size-14 place-items-center rounded-xl bg-zinc-100 text-[#151515]">
            <ShieldCheck />
          </div>
          <h2 className="mt-5 text-lg font-semibold">{tText("What happens next?")}</h2>
          <p className="mt-2 text-sm leading-6 text-outline">
            {tText("The employee profile and app login are created together. You will receive a temporary password to share securely.")}</p>
          <ol className="mt-5 grid gap-3 text-sm">
            {[
              "Assign an office, shift and attendance policy",
              "Approve their registered device if required",
            ].map((step, index) => (
              <li className="flex items-start gap-3" key={step}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-50 text-xs font-bold text-[#151515]">
                  {index + 2}
                </span>
                <span className="pt-0.5 text-zinc-600">{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      {createdAccount && (
        <AccessDialog
          onClose={() =>
            router.push(`/app/employees/${createdAccount.employeeId}?setup=1`)
          }
          title={tText("Employee login created")}
        >
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            {tText("The Employee self-service role is already assigned. No role setup is required.")}</div>
          <div className="mt-4 grid gap-4 rounded-xl border border-zinc-200 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-outline">
                {tText("Login email")}</p>
              <p className="mt-1 font-semibold">{createdAccount.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-outline">
                {tText("Temporary password")}</p>
              <p className="mt-1 break-all font-mono font-semibold">
                {createdAccount.password}
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 text-sm font-bold text-[#151515]"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `Email: ${createdAccount.email}\nTemporary password: ${createdAccount.password}`,
                );
                setCopied(true);
              }}
              type="button"
            >
              <Copy className="size-4" />{" "}
              {copied ? tText("Copied") : tText("Copy login details")}
            </button>
          </div>
          <PrimaryButton
            className="mt-5 w-full justify-center"
            onClick={() =>
              router.push(`/app/employees/${createdAccount.employeeId}?setup=1`)
            }
          >
            {tText("Continue employee setup")}</PrimaryButton>
        </AccessDialog>
      )}
    </AdminPage>
  );
}

export function EmployeeImportView() {
  const { tText } = useTenantLocalization();
  const [schema, setSchema] = useState<EmployeeImportSchema | null>(null);
  const [jobs, setJobs] = useState<Array<{
    id: string;
    filename: string;
    status: string;
    totalRows: number;
    successRows: number;
    errorRows: number;
  }> | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<EmployeeImportError[] | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const load = () =>
    apiClient
      .get("/employee-imports")
      .then(({ data }) => setJobs(data.data))
      .catch(() => setError(tText("Import history could not be loaded.")));
  useEffect(() => {
    void load();
    apiClient
      .get<{ data: EmployeeImportSchema }>("/employee-imports/schema")
      .then(({ data }) => setSchema(data.data))
      .catch(() => setError(tText("The employee import format could not be loaded.")));
  }, []);
  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError(
        tText("Choose a CSV file. Excel files must be saved as CSV UTF-8 first."),
      );
      return;
    }
    if (schema && file.size > schema.maxFileSizeBytes) {
      setError(tText("The CSV is larger than the supported 5 MB limit."));
      return;
    }
    setError("");
    setUploading(true);
    try {
      const contentType = file.type || "text/csv";
      const presign = await apiClient.post("/employee-imports/presign", {
        filename: file.name,
        contentType,
        fileSize: file.size,
      });
      await fetch(presign.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      await apiClient.post("/employee-imports", {
        filename: file.name,
        contentType,
        fileSize: file.size,
        objectKey: presign.data.objectKey,
      });
      await load();
    } catch {
      setError(tText("Employee CSV could not be uploaded or validated."));
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    if (!schema) return;
    const url = URL.createObjectURL(
      new Blob([schema.templateCsv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "deltcrm-employee-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function showErrors(jobId: string) {
    setSelectedJobId(jobId);
    setRowErrors(null);
    setError("");
    try {
      const response = await apiClient.get<{ data: EmployeeImportError[] }>(
        `/employee-imports/${jobId}/errors`,
      );
      setRowErrors(response.data.data);
    } catch {
      setError(tText("Row errors could not be loaded."));
    }
  }
  const importSteps = [
    {
      title: tText("Prepare CSV"),
      body: tText("Download the template and keep the required columns."),
    },
    {
      title: tText("Upload and validate"),
      body: tText("The file is checked before employees are created."),
    },
    {
      title: tText("Review results"),
      body: tText("Fix row errors and retry only the corrected file."),
    },
  ];
  return (
    <AdminPage
      title={tText("Bulk Import")}
      description={tText("Upload employees with safe row-level validation and idempotent retries.")}
    >
      {error && <ErrorState message={error} />}
      <StepList
        className="mb-5"
        currentStep={uploading ? 1 : 0}
        steps={importSteps}
      />
      <Panel className="mb-6 overflow-hidden">
        <div className="border-b border-surface-variant bg-zinc-50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">{tText("Prepare your file")}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {tText("Use the provided columns in the same order. Excel users can open the template and save it as CSV UTF-8.")}</p>
            </div>
            <PrimaryButton
              disabled={!schema}
              onClick={downloadTemplate}
              type="button"
            >
              <Download className="size-4" /> {tText("Download template")}</PrimaryButton>
          </div>
        </div>
        {!schema ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white text-xs uppercase text-outline">
                <tr>
                  <th className="px-5 py-3">{tText("Column")}</th>
                  <th className="px-5 py-3">{tText("Required")}</th>
                  <th className="px-5 py-3">{tText("Accepted value")}</th>
                  <th className="px-5 py-3">{tText("Example")}</th>
                </tr>
              </thead>
              <tbody>
                {schema.fields.map((field) => (
                  <tr
                    className="border-t border-surface-variant"
                    key={field.key}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold">{field.label}</div>
                      <code className="text-xs text-zinc-500">{field.key}</code>
                    </td>
                    <td className="px-5 py-3">
                      {field.required ? tText("Yes") : tText("No")}
                    </td>
                    <td className="px-5 py-3 text-zinc-500">{field.format}</td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {field.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-surface-variant bg-amber-50 px-5 py-4 text-sm text-zinc-500">
              {schema.notes.join(" ")} {tText("Maximum")}{schema.maxRows} {tText("employee rows.")}</div>
          </div>
        )}
      </Panel>
      <Panel className="grid min-h-64 place-items-center border-2 border-dashed border-[#beb8ad] bg-[#f3efe6] p-8 text-center">
        <div className="max-w-xl">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-[#151515] shadow-sm">
            <FileUp className="size-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">
            {tText("Upload employee CSV")}</h2>
          <p className="mt-2 text-sm text-outline">
            {tText("CSV UTF-8 up to 5 MB. The header must match the downloaded template. Validation results will appear in the import history below.")}</p>
          <label className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-[#151515] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a2927]">
            {uploading ? tText("Uploading...") : tText("Choose CSV")}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
              <ClipboardCheck className="size-3.5 text-emerald-700" />
              {tText("Headers checked")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
              <AlertTriangle className="size-3.5 text-amber-700" />
              {tText("Row errors reported")}
            </span>
          </div>
        </div>
      </Panel>
      <div className="mt-6">
        {!jobs ? (
          <LoadingState />
        ) : (
          <Panel className="overflow-hidden">
            <div className="border-b border-border bg-zinc-50 px-6 py-4">
              <h2 className="font-semibold">{tText("Recent imports")}</h2>
              <p className="text-sm text-muted-foreground">
                {tText("Track validation status, successful rows, and files that need correction.")}
              </p>
            </div>
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center gap-4 border-b border-surface-variant px-6 py-4 transition hover:bg-muted/40 last:border-0"
              >
                <div className="min-w-52 flex-1">
                  <div className="font-semibold">{job.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {job.totalRows} {tText("rows")}</div>
                </div>
                <StatusBadge tone={importStatusTone(job.status)}>
                  {job.status}
                </StatusBadge>
                <div className="min-w-48 text-xs">
                  <span className="text-emerald-800">
                    {job.successRows} {tText("imported")}</span>{" "}
                  · <span className="text-error">{job.errorRows} {tText("errors")}</span>
                </div>
                {job.errorRows > 0 && (
                  <button
                    className="text-sm font-semibold text-[#151515] hover:underline"
                    onClick={() => void showErrors(job.id)}
                    type="button"
                  >
                    {tText("View errors")}</button>
                )}
              </div>
            ))}
            {!jobs.length && (
              <EmptyState
                title={tText("No import history")}
                body={tText("Completed and failed imports will appear here.")}
              />
            )}
          </Panel>
        )}
      </div>
      {selectedJobId && (
        <Panel className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-variant bg-zinc-50 px-6 py-4">
            <h2 className="font-semibold">{tText("Rows that need correction")}</h2>
            <button
              className="text-sm font-semibold text-[#151515]"
              onClick={() => {
                setSelectedJobId(null);
                setRowErrors(null);
              }}
              type="button"
            >
              {tText("Close")}</button>
          </div>
          {!rowErrors ? (
            <div className="p-6">
              <LoadingState />
            </div>
          ) : rowErrors.length ? (
            <DataTable minWidth="680px">
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHeadCell>{tText("Row")}</DataTableHeadCell>
                  <DataTableHeadCell>{tText("Employee code")}</DataTableHeadCell>
                  <DataTableHeadCell>{tText("Issue")}</DataTableHeadCell>
                </DataTableRow>
              </DataTableHeader>
              <tbody>
                {rowErrors.map((row) => (
                  <DataTableRow key={`${row.rowNumber}-${row.errorCode}`}>
                    <DataTableCell>
                      <strong>{row.rowNumber}</strong>
                    </DataTableCell>
                    <DataTableCell>
                      {row.employeeCode ?? tText("No employee code")}
                    </DataTableCell>
                    <DataTableCell className="text-on-error-container">
                      {row.errorMessage}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState
              body={tText("This import does not have any row-level validation errors.")}
              title={tText("No row errors")}
            />
          )}
        </Panel>
      )}
    </AdminPage>
  );
}

export function UsersRolesView() {
  const { tText } = useTenantLocalization();
  const router = useRouter();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const [users, setUsers] = useState<User[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleIds, setInviteRoleIds] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState("");
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRolePreset, setCustomRolePreset] = useState("manager");
  const [busy, setBusy] = useState(false);
  const load = () =>
    Promise.all([apiClient.get("/users?limit=100"), apiClient.get("/roles")])
      .then(([userResult, roleResult]) => {
        setUsers(userResult.data.data);
        setRoles(roleResult.data.data);
      })
      .catch(() => setError(tText("Users and roles could not be loaded.")));
  useEffect(() => {
    void load();
  }, []);
  async function invite() {
    setError("");
    setSent(false);
    try {
      await apiClient.post("/users/invitations", {
        email: inviteEmail,
        roleIds: inviteRoleIds,
      });
      setSent(true);
      setInviteEmail("");
      setInviteRoleIds([]);
    } catch {
      setError(
        tText("Invitation could not be sent. Check the email, role, or an existing pending invitation."),
      );
    }
  }
  function openUserAccess(user: User) {
    setEditingUser(user);
    setEditingRoleIds(user.roles.map(({ id }) => id));
    setEditingStatus(user.status);
  }
  async function saveUserAccess() {
    if (!editingUser) return;
    setBusy(true);
    setError("");
    try {
      const employeeRoleIds = editingUser.roles
        .filter(({ name }) => name === "EMPLOYEE")
        .map(({ id }) => id);
      await apiClient.patch(`/users/${editingUser.id}/roles`, {
        roleIds: [...new Set([...employeeRoleIds, ...editingRoleIds])],
      });
      if (editingStatus !== editingUser.status) {
        await apiClient.patch(`/users/${editingUser.id}/status`, {
          status: editingStatus,
        });
      }
      setEditingUser(null);
      await load();
    } catch (caught) {
      setError(apiErrorMessage(caught, "Account access could not be updated."));
    } finally {
      setBusy(false);
    }
  }
  async function createCustomRole() {
    const preset = ROLE_PRESETS.find(({ id }) => id === customRolePreset);
    setBusy(true);
    setError("");
    try {
      const response = await apiClient.post("/roles", {
        name: customRoleName,
        permissionKeys: preset?.keys ?? [],
      });
      setCreateRoleOpen(false);
      setCustomRoleName("");
      await load();
      router.push(`/app/access/roles/${response.data.data.id}`);
    } catch (caught) {
      setError(apiErrorMessage(caught, "Custom role could not be created."));
    } finally {
      setBusy(false);
    }
  }
  const elevatedRoles = roles.filter((role) => role.name !== "EMPLOYEE");
  const canManageUsers = permissions.includes("identity.users.roles.update");
  const canCreateRoles = permissions.includes("identity.roles.create");
  return (
    <AdminPage
      title={tText("Administrators & access")}
      description={tText("Manage Business Admin, HR and Manager access. Employee login access is managed from each employee profile.")}
      action={
        <div className="flex flex-wrap gap-2">
          {canCreateRoles && (
            <button
              className="inline-flex h-11 items-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-[#151515] hover:bg-zinc-50"
              onClick={() => setCreateRoleOpen(true)}
              type="button"
            >
              <ShieldCheck className="mr-2 size-4" />
              {tText("Create custom role")}</button>
          )}
          {canManageUsers && (
            <PrimaryButton
              onClick={() => {
                setInviteOpen(true);
                setSent(false);
              }}
            >
              <Plus className="size-4" />
              {tText("Invite administrator")}</PrimaryButton>
          )}
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {!users ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-300 bg-white p-5">
            <div>
              <p className="font-bold text-zinc-800">{tText("Employee app accounts")}</p>
              <p className="mt-1 text-sm text-outline">
                {tText("Create and invite employees from the employee directory. Their Employee self-service role is assigned automatically.")}</p>
            </div>
            <Link
              className="text-sm font-bold text-[#151515]"
              href="/app/employees"
            >
              {tText("Open employees →")}</Link>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <Panel className="overflow-hidden">
              <div className="border-b border-surface-variant bg-zinc-50 px-6 py-4 font-semibold">
                {tText("Workspace login accounts")}</div>
              {users.map((user) => (
                <button
                  key={user.id}
                  className="flex w-full items-center justify-between gap-4 border-b border-surface-variant px-6 py-4 text-left last:border-0 hover:bg-zinc-50 disabled:cursor-default"
                  disabled={!canManageUsers}
                  onClick={() => openUserAccess(user)}
                  type="button"
                >
                  <div>
                    <div className="font-semibold">
                      {user.employee?.fullName || user.email}
                    </div>
                    {user.employee && (
                      <div className="text-xs text-zinc-500">{user.email}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {user.roles.map((role) => role.name).join(", ") ||
                        tText("No role")}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-300/35 px-3 py-1 text-xs font-semibold text-emerald-900">
                    {user.status}
                  </span>
                </button>
              ))}
            </Panel>
            <Panel className="p-6">
              <h2 className="mb-1 font-semibold">{tText("Elevated roles")}</h2>
              <p className="mb-4 text-xs leading-5 text-outline">
                {tText("These roles are for people who manage the workspace or approve work. Employee self-service is intentionally not configured here.")}</p>
              <div className="grid gap-3">
                {elevatedRoles.map((role) => (
                  <Link
                    key={role.id}
                    href={`/app/access/roles/${role.id}`}
                    className="flex items-center justify-between rounded-lg border border-surface-variant p-4 hover:border-[#151515]"
                  >
                    <div>
                      <div className="font-semibold">{role.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {role.isSystem ? tText("System role") : tText("Custom role")} ·{" "}
                        {role.assignedUsers ?? 0} {tText("users")}</div>
                      <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-500">
                        {SYSTEM_ROLE_SUMMARIES[role.name] ??
                          `${role.permissionKeys?.length ?? 0} configured capabilities.`}
                      </p>
                    </div>
                    <ShieldCheck className="size-5 text-[#151515]" />
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}
      {inviteOpen && (
        <AccessDialog
          title={tText("Invite administrator")}
          onClose={() => setInviteOpen(false)}
        >
          {sent ? (
            <div className="rounded-xl bg-emerald-100 p-5 text-sm text-emerald-900">
              {tText("Invitation created successfully. Delivery is handled by the configured notification provider.")}</div>
          ) : (
            <div className="grid gap-4">
              <Field label={tText("Work email")}>
                <input
                  type="email"
                  className={inputClass}
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </Field>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">{tText("Roles")}</legend>
                {elevatedRoles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={inviteRoleIds.includes(role.id)}
                      onChange={(event) =>
                        setInviteRoleIds((current) =>
                          event.target.checked
                            ? [...current, role.id]
                            : current.filter((id) => id !== role.id),
                        )
                      }
                    />
                    {role.name}
                  </label>
                ))}
              </fieldset>
              <PrimaryButton
                disabled={!inviteEmail || !inviteRoleIds.length}
                onClick={invite}
              >
                {tText("Send invitation")}</PrimaryButton>
            </div>
          )}
        </AccessDialog>
      )}
      {editingUser && (
        <AccessDialog
          title={`Manage ${editingUser.employee?.fullName || editingUser.email}`}
          onClose={() => setEditingUser(null)}
        >
          <div className="grid gap-5">
            <div>
              <p className="text-sm font-semibold">{tText("Elevated roles")}</p>
              <p className="mt-1 text-xs leading-5 text-outline">
                {tText("Employee self-service access is retained automatically.")}</p>
            </div>
            <div className="grid gap-2">
              {elevatedRoles.map((role) => (
                <label
                  className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4"
                  key={role.id}
                >
                  <input
                    checked={editingRoleIds.includes(role.id)}
                    className="mt-1 accent-primary"
                    onChange={(event) =>
                      setEditingRoleIds((current) =>
                        event.target.checked
                          ? [...current, role.id]
                          : current.filter((id) => id !== role.id),
                      )
                    }
                    type="checkbox"
                  />
                  <span>
                    <strong className="text-sm">{role.name}</strong>
                    <span className="mt-1 block text-xs leading-5 text-outline">
                      {SYSTEM_ROLE_SUMMARIES[role.name] ??
                        `${role.permissionKeys?.length ?? 0} configured capabilities.`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Field label={tText("Account status")}>
              <select
                className={inputClass}
                onChange={(event) => setEditingStatus(event.target.value)}
                value={editingStatus}
              >
                <option value="ACTIVE">{tText("Active")}</option>
                <option value="DISABLED">{tText("Disabled")}</option>
                <option value="LOCKED">{tText("Locked")}</option>
              </select>
            </Field>
            <PrimaryButton disabled={busy} onClick={saveUserAccess}>
              {busy ? tText("Saving...") : tText("Save access")}
            </PrimaryButton>
          </div>
        </AccessDialog>
      )}
      {createRoleOpen && (
        <AccessDialog
          title={tText("Create custom role")}
          onClose={() => setCreateRoleOpen(false)}
        >
          <div className="grid gap-5">
            <Field label={tText("Role name")}>
              <input
                className={inputClass}
                onChange={(event) => setCustomRoleName(event.target.value)}
                placeholder={tText("For example: Attendance coordinator")}
                value={customRoleName}
              />
            </Field>
            <Field label={tText("Start with")}>
              <select
                className={inputClass}
                onChange={(event) => setCustomRolePreset(event.target.value)}
                value={customRolePreset}
              >
                {ROLE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {tText(preset.name)}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs leading-5 text-outline">
              {tText("The role opens in the permission editor after creation so its access can be reviewed before assignment.")}</p>
            <PrimaryButton
              disabled={busy || customRoleName.trim().length < 2}
              onClick={createCustomRole}
            >
              {busy ? tText("Creating...") : tText("Create and configure")}
            </PrimaryButton>
          </div>
        </AccessDialog>
      )}
    </AdminPage>
  );
}

export function RoleEditorView({ roleId }: { roleId: string }) {
  const { tText } = useTenantLocalization();
  const [role, setRole] = useState<Role | null>(null);
  const [catalog, setCatalog] = useState<
    Array<{ module: string; keys: string[] }>
  >([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  useEffect(() => {
    Promise.all([
      apiClient.get(`/roles/${roleId}`),
      apiClient.get("/permissions"),
    ])
      .then(([roleResult, catalogResult]) => {
        const value = roleResult.data.data as Role;
        setRole(value);
        setCatalog(catalogResult.data.data);
        setSelected(new Set(value.permissionKeys ?? []));
      })
      .catch(() => setError(tText("Role permissions could not be loaded.")));
  }, [roleId]);
  async function save() {
    setError("");
    setSaved(false);
    await apiClient
      .put(`/roles/${roleId}/permissions`, { permissionKeys: [...selected] })
      .then(({ data }) => {
        setRole(data.data);
        setSaved(true);
      })
      .catch(() => setError(tText("Permission matrix could not be saved.")));
  }
  function applyPreset(keys: readonly string[]) {
    const available = new Set(catalog.flatMap((group) => group.keys));
    setSelected(new Set(keys.filter((key) => available.has(key))));
    setSaved(false);
  }
  return (
    <AdminPage
      title={role?.name || "Role Editor"}
      description={tText("Choose what people with this role can do. Technical permission names are hidden by default.")}
      action={
        role && !role.isSystem ? (
          <PrimaryButton onClick={save}>{tText("Save role access")}</PrimaryButton>
        ) : undefined
      }
    >
      {error && <ErrorState message={error} />}
      {!role ? (
        <LoadingState />
      ) : role.isSystem ? (
        <div className="grid gap-6">
          <div className="flex items-start gap-3 rounded-xl border border-zinc-300 bg-white p-5 text-sm text-zinc-600">
            <Info className="mt-0.5 size-5 shrink-0 text-[#151515]" />
            <div>
              <strong className="text-zinc-800">{tText("Built-in role")}</strong>
              <p className="mt-1 leading-6">
                {tText("DeltCRM assigns and maintains this role automatically. It cannot be edited because changing its technical permissions could break essential product flows.")}</p>
            </div>
          </div>
          <Panel className="p-6">
            <h2 className="text-lg font-bold">{tText("What this role is for")}</h2>
            <p className="mt-2 text-sm leading-6 text-outline">
              {role.name === "EMPLOYEE"
                ? tText("Employee self-service for the mobile app, attendance, leave and personal requests. Assign it by inviting an employee from their profile.")
                : role.name === "HR_ADMIN"
                  ? tText("Day-to-day employee, attendance, leave and policy administration.")
                  : role.name === "MANAGER"
                    ? tText("Team visibility and approval work for assigned reporting employees.")
                    : tText("Full business administration for this tenant workspace.")}
            </p>
            <p className="mt-4 text-sm font-semibold text-zinc-600">
              {selected.size} {tText("protected capabilities included")}</p>
            {role.name === "EMPLOYEE" && (
              <Link
                className="mt-5 inline-flex text-sm font-bold text-[#151515]"
                href="/app/employees"
              >
                {tText("Manage employee accounts →")}</Link>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid gap-6">
          <Panel className="p-6">
            <h2 className="text-lg font-bold">{tText("Start with a common role")}</h2>
            <p className="mt-1 text-sm text-outline">
              {tText("A preset replaces the current selection. You can adjust it before saving.")}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {ROLE_PRESETS.map((preset) => (
                <button
                  className="rounded-xl border border-zinc-300 p-4 text-left transition hover:border-[#151515] hover:bg-zinc-50"
                  key={preset.id}
                  onClick={() => applyPreset(preset.keys)}
                  type="button"
                >
                  <strong className="text-sm">
                    {tText("Use")} {tText(preset.name)}
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-outline">
                    {tText(preset.description)}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-600">
              {selected.size} {tText("capabilities enabled")}</p>
            <label className="flex items-center gap-2 text-sm text-zinc-500">
              <input
                checked={showTechnical}
                className="accent-primary"
                onChange={(event) => setShowTechnical(event.target.checked)}
                type="checkbox"
              />
              {tText("Show technical names")}</label>
          </div>
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-100 p-4 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="size-5" /> {tText("Role access saved.")}</div>
          )}
          <Panel className="overflow-hidden">
            {catalog.map((group) => (
              <div
                key={group.module}
                className="border-b border-surface-variant p-6 last:border-0"
              >
                <h2 className="mb-1 text-base font-bold text-zinc-800">
                  {sentenceCase(group.module)}
                </h2>
                <p className="mb-4 text-sm text-outline">
                  {tText("Access related to")}{group.module.replaceAll("-", " ")} {tText("work.")}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.keys.map((key) => {
                    const presentation = describePermission(key);
                    return (
                      <label
                        key={key}
                        className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-primary"
                          checked={selected.has(key)}
                          disabled={role.isSystem}
                          onChange={(event) => {
                            setSaved(false);
                            setSelected((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(key);
                              else next.delete(key);
                              return next;
                            });
                          }}
                        />
                        <span>
                          <strong className="block font-semibold text-zinc-800">
                            {sentenceCase(presentation.title)}
                          </strong>
                          <span className="mt-1 block text-xs leading-5 text-outline">
                            {presentation.description}
                          </span>
                          {showTechnical && (
                            <code className="mt-2 block break-all text-[11px] text-outline">
                              {key}
                            </code>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}

function AccessDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { tText } = useTenantLocalization();
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-zinc-900/45 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-outline">
            {tText("Close")}</button>
        </div>
        {children}
      </div>
    </div>
  );
}
