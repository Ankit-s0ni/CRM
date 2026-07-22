"use client";

import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  Info,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { InternationalPhoneInput } from "@/shared/components/international-phone-input";
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
};
type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissionKeys?: string[];
  assignedUsers?: number;
};
type User = { id: string; email: string; status: string; roles: Role[] };

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
    name: "Employee self-service",
    description: "Own profile, attendance, leave and notifications only.",
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
    name: "Team manager",
    description: "Employee access plus team attendance and leave approvals.",
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
      description: "Only the signed-in employee's own information and actions.",
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

export function OrganizationView() {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [error, setError] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentParentId, setDepartmentParentId] = useState("");
  const [designationName, setDesignationName] = useState("");
  const load = () =>
    Promise.all([
      apiClient.get("/departments?view=tree"),
      apiClient.get("/designations?limit=100"),
    ])
      .then(([departmentResult, designationResult]) => {
        setDepartments(departmentResult.data.data);
        setDesignations(designationResult.data.data);
        setError("");
      })
      .catch(() => setError("Organization structure could not be loaded."));
  useEffect(() => {
    void load();
  }, []);
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
        setError(
          apiErrorMessage(caught, "Designation could not be created."),
        ),
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
  return (
    <AdminPage
      title="Organization Builder"
      description="Build department hierarchy and maintain reusable designations."
    >
      {error && <ErrorState message={error} />}
      {!departments ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6">
          <Panel className="flex flex-wrap items-center gap-4 border-zinc-200 bg-zinc-50 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-primary">
              <Info className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">Organization comes before workplace setup</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Departments and designations describe employee structure. The next step defines the physical office and attendance geofence.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
              href="/app/attendance/offices"
            >
              Continue to office setup
            </Link>
          </Panel>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <Panel className="p-7">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Departments</h2>
              <Building2 className="text-primary" />
            </div>
            <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
              <input
                className={inputClass}
                placeholder="New department"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
              />
              <select
                aria-label="Parent department"
                className={inputClass}
                onChange={(event) => setDepartmentParentId(event.target.value)}
                value={departmentParentId}
              >
                <option value="">Top-level department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {"— ".repeat(department.depth)}{department.name}
                  </option>
                ))}
              </select>
              <PrimaryButton
                disabled={departmentName.trim().length < 2}
                onClick={addDepartment}
              >
                <Plus className="size-4" />
                Add
              </PrimaryButton>
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
                  title="No departments"
                  body="Create your first department to start organizing employees."
                />
              )}
            </div>
          </Panel>
          <Panel className="p-7">
            <h2 className="mb-6 text-xl font-semibold">Designations</h2>
            <div className="mb-5 flex gap-3">
              <input
                className={inputClass}
                placeholder="New designation"
                value={designationName}
                onChange={(e) => setDesignationName(e.target.value)}
              />
              <PrimaryButton
                disabled={designationName.trim().length < 2}
                onClick={addDesignation}
              >
                <Plus className="size-4" />
                Add
              </PrimaryButton>
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
                  body="Create job titles that can be assigned to employees."
                  title="No designations"
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
        <div className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-primary">
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
              <option value="">Top level</option>
              {allDepartments
                .filter(
                  ({ id }) => id !== department.id && !descendants.has(id),
                )
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {"— ".repeat(option.depth)}{option.name}
                  </option>
                ))}
            </select>
            <button
              className="text-xs font-bold text-primary"
              disabled={name.trim().length < 2}
              onClick={async () => {
                await onRename(department.id, name);
                setEditing(false);
              }}
              type="button"
            >
              Save
            </button>
            <button
              className="text-xs text-outline"
              onClick={() => {
                setName(department.name);
                setEditing(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-50"
              onClick={() => setAddingChild((current) => !current)}
              title="Add child department"
              type="button"
            >
              <Plus className="size-4" />
            </button>
            <button
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-50"
              onClick={() => setEditing(true)}
              title="Edit department"
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
              title="Delete department"
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
            Add
          </PrimaryButton>
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
        {designation.employeeCount ?? 0} employees
      </span>
      {editing ? (
        <>
          <button
            className="text-xs font-bold text-primary"
            disabled={name.trim().length < 2}
            onClick={async () => {
              await onRename(designation.id, name);
              setEditing(false);
            }}
            type="button"
          >
            Save
          </button>
          <button
            className="text-xs text-outline"
            onClick={() => {
              setName(designation.name);
              setEditing(false);
            }}
            type="button"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            className="rounded-lg p-2 text-zinc-500 hover:bg-white"
            onClick={() => setEditing(true)}
            title="Edit designation"
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
            title="Delete designation"
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
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [data, setData] = useState<Employee[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    apiClient
      .get(`/employees?limit=100${query ? `&${query}` : ""}`)
      .then(({ data }) => {
        setData(data.data);
        setError("");
      })
      .catch(() => setError("Employees could not be loaded."));
  }, [query]);
  return (
    <AdminPage
      title="Employees"
      description="Manage workforce records, reporting relationships and lifecycle status."
      action={
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-11 items-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-primary hover:bg-zinc-50"
            href="/app/imports/employees"
          >
            <FileUp className="mr-2 size-4" />
            Import employees
          </Link>
          <Link href="/app/employees/new">
            <PrimaryButton>
              <UserRoundPlus className="size-4" />
              Add employee
            </PrimaryButton>
          </Link>
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6">
          <Panel className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Onboard an employee</h2>
                <p className="mt-1 text-sm text-outline">
                  Follow these steps in order. Each employee profile shows what
                  is still missing.
                </p>
              </div>
              <Link
                className="text-sm font-bold text-primary"
                href="/app/employees/new"
              >
                Start setup →
              </Link>
            </div>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["1", "Create profile", "Add employment and organization details."],
                ["2", "Set attendance", "Assign workplace, shift and policy."],
                ["3", "Enable access", "Invite the employee and approve their device."],
              ].map(([number, title, body]) => (
                <li className="rounded-xl bg-zinc-50 p-4" key={number}>
                  <span className="text-xs font-bold text-primary">
                    STEP {number}
                  </span>
                  <strong className="mt-2 block text-sm">{title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-outline">
                    {body}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel className="overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-outline">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Work type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-t border-surface-variant transition hover:bg-zinc-50"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/app/employees/${employee.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {employee.fullName}
                    </Link>
                    <div className="text-xs text-outline">
                      {employee.phone || "No phone"}
                    </div>
                  </td>
                  <td>{employee.employeeCode}</td>
                  <td>{employee.department?.name || "—"}</td>
                  <td>{employee.workType}</td>
                  <td>
                    <span className="rounded-full bg-emerald-300/35 px-3 py-1 text-xs font-semibold text-emerald-900">
                      {employee.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.length && (
            <EmptyState
              title="No employees"
              body="Add employees individually or use the bulk import wizard."
            />
          )}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}

export function EmployeeEditorView() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
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
    dateOfJoining: new Date().toISOString().slice(0, 10),
    deptId: "",
    designationId: "",
  });
  useEffect(() => {
    Promise.all([
      apiClient.get("/departments"),
      apiClient.get("/designations?limit=100"),
      apiClient.get("/employees/next-code"),
    ])
      .then(([departmentResult, designationResult, codeResult]) => {
        setDepartments(departmentResult.data.data);
        setDesignations(designationResult.data.data);
        setForm((value) => ({
          ...value,
          employeeCode:
            codeResult.data.data?.employeeCode ??
            codeResult.data.employeeCode ??
            "",
        }));
      })
      .catch(() => setError("Employee form options could not be loaded."));
  }, []);
  async function save() {
    setError("");
    if (
      !form.employeeCode.trim() ||
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.deptId
    ) {
      setError(
        "Employee code, full name, work email, phone and department are required.",
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
        router.push(employeeId ? `/app/employees/${employeeId}?setup=1` : "/app/employees");
      })
      .catch(() =>
        setError(
          "Employee could not be created. Review code, phone and organization fields.",
        ),
      );
  }
  return (
    <AdminPage
      title="Add Employee"
      description="Create a secure employee record and reporting placement."
      action={<PrimaryButton onClick={save}>Create employee</PrimaryButton>}
    >
      {error && <ErrorState message={error} />}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel className="p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Employee code">
              <input
                className={inputClass}
                value={form.employeeCode}
                onChange={(e) =>
                  setForm({ ...form, employeeCode: e.target.value })
                }
              />
            </Field>
            <Field label="Full name">
              <input
                className={inputClass}
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <InternationalPhoneInput
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
              />
              <p className="mt-2 text-xs leading-5 text-outline">
                Select the country code, then enter the local mobile number.
              </p>
            </Field>
            <Field label="Work email">
              <input
                className={inputClass}
                placeholder="employee@company.com"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <p className="mt-2 text-xs leading-5 text-outline">
                This becomes the employee&apos;s app login email.
              </p>
            </Field>
            <Field label="Date of joining">
              <input
                type="date"
                className={inputClass}
                value={form.dateOfJoining}
                onChange={(e) =>
                  setForm({ ...form, dateOfJoining: e.target.value })
                }
              />
            </Field>
            <Field label="Department">
              <select
                className={inputClass}
                value={form.deptId}
                onChange={(e) => setForm({ ...form, deptId: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Designation">
              <select
                className={inputClass}
                value={form.designationId}
                onChange={(e) =>
                  setForm({ ...form, designationId: e.target.value })
                }
              >
                <option value="">No designation</option>
                {designations.map((designation) => (
                  <option key={designation.id} value={designation.id}>
                    {designation.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work type">
              <select
                className={inputClass}
                value={form.workType}
                onChange={(e) => setForm({ ...form, workType: e.target.value })}
              >
                <option value="OFFICE">Office</option>
                <option value="FIELD">Field</option>
                <option value="HYBRID">Hybrid</option>
              </select>
              <p className="mt-2 text-xs leading-5 text-outline">
                {form.workType === "OFFICE"
                  ? "Office employees normally check in at an assigned workplace and do not use continuous field tracking."
                  : form.workType === "FIELD"
                    ? "Field employees can use field GPS and route tracking when those Attendance features are enabled."
                    : "Hybrid employees can use office or field attendance rules based on their assigned policy and schedule."}
              </p>
            </Field>
          </div>
        </Panel>
        <Panel className="p-7">
          <div className="grid size-14 place-items-center rounded-xl bg-zinc-100 text-primary">
            <ShieldCheck />
          </div>
          <h2 className="mt-5 text-lg font-semibold">What happens next?</h2>
          <p className="mt-2 text-sm leading-6 text-outline">
            The employee profile and app login are created together. You will
            receive a temporary password to share securely.
          </p>
          <ol className="mt-5 grid gap-3 text-sm">
            {[
              "Assign an office, shift and attendance policy",
              "Approve their registered device if required",
            ].map((step, index) => (
              <li className="flex items-start gap-3" key={step}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-50 text-xs font-bold text-primary">
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
          title="Employee login created"
        >
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            The Employee self-service role is already assigned. No role setup
            is required.
          </div>
          <div className="mt-4 grid gap-4 rounded-xl border border-zinc-200 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-outline">
                Login email
              </p>
              <p className="mt-1 font-semibold">{createdAccount.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-outline">
                Temporary password
              </p>
              <p className="mt-1 break-all font-mono font-semibold">
                {createdAccount.password}
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 text-sm font-bold text-primary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `Email: ${createdAccount.email}\nTemporary password: ${createdAccount.password}`,
                );
                setCopied(true);
              }}
              type="button"
            >
              <Copy className="size-4" /> {copied ? "Copied" : "Copy login details"}
            </button>
          </div>
          <PrimaryButton
            className="mt-5 w-full justify-center"
            onClick={() =>
              router.push(`/app/employees/${createdAccount.employeeId}?setup=1`)
            }
          >
            Continue employee setup
          </PrimaryButton>
        </AccessDialog>
      )}
    </AdminPage>
  );
}

export function EmployeeImportView() {
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
      .catch(() => setError("Import history could not be loaded."));
  useEffect(() => {
    void load();
    apiClient
      .get<{ data: EmployeeImportSchema }>("/employee-imports/schema")
      .then(({ data }) => setSchema(data.data))
      .catch(() => setError("The employee import format could not be loaded."));
  }, []);
  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError(
        "Choose a CSV file. Excel files must be saved as CSV UTF-8 first.",
      );
      return;
    }
    if (schema && file.size > schema.maxFileSizeBytes) {
      setError("The CSV is larger than the supported 5 MB limit.");
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
      setError("Employee CSV could not be uploaded or validated.");
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
      setError("Row errors could not be loaded.");
    }
  }
  return (
    <AdminPage
      title="Bulk Import"
      description="Upload employees with safe row-level validation and idempotent retries."
    >
      {error && <ErrorState message={error} />}
      <Panel className="mb-6 overflow-hidden">
        <div className="border-b border-surface-variant bg-zinc-50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Prepare your file</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Use the provided columns in the same order. Excel users can open
                the template and save it as CSV UTF-8.
              </p>
            </div>
            <PrimaryButton
              disabled={!schema}
              onClick={downloadTemplate}
              type="button"
            >
              <Download className="size-4" /> Download template
            </PrimaryButton>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              "Download and complete the template",
              "Upload the CSV for validation",
              "Review imported rows and errors",
            ].map((step, index) => (
              <div className="flex items-center gap-3 text-sm" key={step}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
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
                  <th className="px-5 py-3">Column</th>
                  <th className="px-5 py-3">Required</th>
                  <th className="px-5 py-3">Accepted value</th>
                  <th className="px-5 py-3">Example</th>
                </tr>
              </thead>
              <tbody>
                {schema.fields.map((field) => (
                  <tr className="border-t border-surface-variant" key={field.key}>
                    <td className="px-5 py-3">
                      <div className="font-semibold">{field.label}</div>
                      <code className="text-xs text-zinc-500">
                        {field.key}
                      </code>
                    </td>
                    <td className="px-5 py-3">
                      {field.required ? "Yes" : "No"}
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
              {schema.notes.join(" ")} Maximum {schema.maxRows} employee rows.
            </div>
          </div>
        )}
      </Panel>
      <Panel className="grid min-h-64 place-items-center border-2 border-dashed border-zinc-300 p-8 text-center">
        <div>
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-zinc-100 text-primary">
            <FileUp />
          </div>
          <h2 className="mt-5 text-xl font-semibold">
            Drop your employee CSV here
          </h2>
          <p className="mt-2 text-sm text-outline">
            CSV UTF-8 up to 5 MB. The header must match the downloaded template.
          </p>
          <label className="mt-5 inline-flex h-11 cursor-pointer items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white">
            {uploading ? "Uploading..." : "Choose CSV"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        </div>
      </Panel>
      <div className="mt-6">
        {!jobs ? (
          <LoadingState />
        ) : (
          <Panel className="overflow-hidden">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center gap-4 border-b border-surface-variant px-6 py-4 last:border-0"
              >
                <div className="min-w-52 flex-1">
                  <div className="font-semibold">{job.filename}</div>
                  <div className="text-xs text-outline">
                    {job.totalRows} rows
                  </div>
                </div>
                <span className="min-w-24 text-sm font-medium">
                  {job.status}
                </span>
                <div className="min-w-48 text-xs">
                  <span className="text-emerald-800">
                    {job.successRows} imported
                  </span>{" "}
                  ·{" "}
                  <span className="text-error">{job.errorRows} errors</span>
                </div>
                {job.errorRows > 0 && (
                  <button
                    className="text-sm font-semibold text-primary hover:underline"
                    onClick={() => void showErrors(job.id)}
                    type="button"
                  >
                    View errors
                  </button>
                )}
              </div>
            ))}
            {!jobs.length && (
              <EmptyState
                title="No import history"
                body="Completed and failed imports will appear here."
              />
            )}
          </Panel>
        )}
      </div>
      {selectedJobId && (
        <Panel className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-variant bg-zinc-50 px-6 py-4">
            <h2 className="font-semibold">Rows that need correction</h2>
            <button
              className="text-sm font-semibold text-primary"
              onClick={() => {
                setSelectedJobId(null);
                setRowErrors(null);
              }}
              type="button"
            >
              Close
            </button>
          </div>
          {!rowErrors ? (
            <div className="p-6">
              <LoadingState />
            </div>
          ) : rowErrors.length ? (
            <div className="divide-y divide-surface-variant">
              {rowErrors.map((row) => (
                <div
                  className="grid gap-1 px-6 py-4 text-sm md:grid-cols-[100px_160px_1fr]"
                  key={`${row.rowNumber}-${row.errorCode}`}
                >
                  <strong>Row {row.rowNumber}</strong>
                  <span>{row.employeeCode ?? "No employee code"}</span>
                  <span className="text-on-error-container">{row.errorMessage}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              body="This import does not have any row-level validation errors."
              title="No row errors"
            />
          )}
        </Panel>
      )}
    </AdminPage>
  );
}

export function UsersRolesView() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleIds, setInviteRoleIds] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const load = () =>
    Promise.all([apiClient.get("/users?limit=100"), apiClient.get("/roles")])
      .then(([userResult, roleResult]) => {
        setUsers(userResult.data.data);
        setRoles(roleResult.data.data);
      })
      .catch(() => setError("Users and roles could not be loaded."));
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
        "Invitation could not be sent. Check the email, role, or an existing pending invitation.",
      );
    }
  }
  const elevatedRoles = roles.filter((role) => role.name !== "EMPLOYEE");
  return (
    <AdminPage
      title="Administrators & access"
      description="Manage Business Admin, HR and Manager access. Employee login access is managed from each employee profile."
      action={
        <PrimaryButton
          onClick={() => {
            setInviteOpen(true);
            setSent(false);
          }}
        >
          <Plus className="size-4" />
          Invite administrator
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      {!users ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-300 bg-white p-5">
            <div>
              <p className="font-bold text-zinc-800">Employee app accounts</p>
              <p className="mt-1 text-sm text-outline">
                Create and invite employees from the employee directory. Their
                Employee self-service role is assigned automatically.
              </p>
            </div>
            <Link
              className="text-sm font-bold text-primary"
              href="/app/employees"
            >
              Open employees →
            </Link>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <Panel className="overflow-hidden">
            <div className="border-b border-surface-variant bg-zinc-50 px-6 py-4 font-semibold">
              Workspace login accounts
            </div>
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between border-b border-surface-variant px-6 py-4 last:border-0"
              >
                <div>
                  <div className="font-semibold">{user.email}</div>
                  <div className="text-xs text-outline">
                    {user.roles.map((role) => role.name).join(", ") ||
                      "No role"}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-300/35 px-3 py-1 text-xs font-semibold text-emerald-900">
                  {user.status}
                </span>
              </div>
            ))}
            </Panel>
            <Panel className="p-6">
            <h2 className="mb-1 font-semibold">Elevated roles</h2>
            <p className="mb-4 text-xs leading-5 text-outline">
              These roles are for people who manage the workspace or approve
              work. Employee self-service is intentionally not configured here.
            </p>
            <div className="grid gap-3">
              {elevatedRoles.map((role) => (
                <Link
                  key={role.id}
                  href={`/app/access/roles/${role.id}`}
                  className="flex items-center justify-between rounded-lg border border-surface-variant p-4 hover:border-primary"
                >
                  <div>
                    <div className="font-semibold">{role.name}</div>
                    <div className="text-xs text-outline">
                      {role.isSystem ? "System role" : "Custom role"} ·{" "}
                      {role.assignedUsers ?? 0} users
                    </div>
                  </div>
                  <ShieldCheck className="size-5 text-primary" />
                </Link>
              ))}
            </div>
            </Panel>
          </div>
        </div>
      )}
      {inviteOpen && (
        <AccessDialog
          title="Invite administrator"
          onClose={() => setInviteOpen(false)}
        >
          {sent ? (
            <div className="rounded-xl bg-emerald-100 p-5 text-sm text-emerald-900">
              Invitation created successfully. Delivery is handled by the
              configured notification provider.
            </div>
          ) : (
            <div className="grid gap-4">
              <Field label="Work email">
                <input
                  type="email"
                  className={inputClass}
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </Field>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Roles</legend>
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
                Send invitation
              </PrimaryButton>
            </div>
          )}
        </AccessDialog>
      )}
    </AdminPage>
  );
}

export function RoleEditorView({ roleId }: { roleId: string }) {
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
      .catch(() => setError("Role permissions could not be loaded."));
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
      .catch(() => setError("Permission matrix could not be saved."));
  }
  function applyPreset(keys: readonly string[]) {
    const available = new Set(catalog.flatMap((group) => group.keys));
    setSelected(new Set(keys.filter((key) => available.has(key))));
    setSaved(false);
  }
  return (
    <AdminPage
      title={role?.name || "Role Editor"}
      description="Choose what people with this role can do. Technical permission names are hidden by default."
      action={
        role && !role.isSystem ? (
          <PrimaryButton onClick={save}>Save role access</PrimaryButton>
        ) : undefined
      }
    >
      {error && <ErrorState message={error} />}
      {!role ? (
        <LoadingState />
      ) : role.isSystem ? (
        <div className="grid gap-6">
          <div className="flex items-start gap-3 rounded-xl border border-zinc-300 bg-white p-5 text-sm text-zinc-600">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <strong className="text-zinc-800">Built-in role</strong>
              <p className="mt-1 leading-6">
                DeltCRM assigns and maintains this role automatically. It
                cannot be edited because changing its technical permissions
                could break essential product flows.
              </p>
            </div>
          </div>
          <Panel className="p-6">
            <h2 className="text-lg font-bold">What this role is for</h2>
            <p className="mt-2 text-sm leading-6 text-outline">
              {role.name === "EMPLOYEE"
                ? "Employee self-service for the mobile app, attendance, leave and personal requests. Assign it by inviting an employee from their profile."
                : role.name === "HR_ADMIN"
                  ? "Day-to-day employee, attendance, leave and policy administration."
                  : role.name === "MANAGER"
                    ? "Team visibility and approval work for assigned reporting employees."
                    : "Full business administration for this tenant workspace."}
            </p>
            <p className="mt-4 text-sm font-semibold text-zinc-600">
              {selected.size} protected capabilities included
            </p>
            {role.name === "EMPLOYEE" && (
              <Link
                className="mt-5 inline-flex text-sm font-bold text-primary"
                href="/app/employees"
              >
                Manage employee accounts →
              </Link>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid gap-6">
          <Panel className="p-6">
              <h2 className="text-lg font-bold">Start with a common role</h2>
              <p className="mt-1 text-sm text-outline">
                A preset replaces the current selection. You can adjust it
                before saving.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    className="rounded-xl border border-zinc-300 p-4 text-left transition hover:border-primary hover:bg-zinc-50"
                    key={preset.id}
                    onClick={() => applyPreset(preset.keys)}
                    type="button"
                  >
                    <strong className="text-sm">Use {preset.name}</strong>
                    <p className="mt-1 text-xs leading-5 text-outline">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-600">
              {selected.size} capabilities enabled
            </p>
            <label className="flex items-center gap-2 text-sm text-zinc-500">
              <input
                checked={showTechnical}
                className="accent-primary"
                onChange={(event) => setShowTechnical(event.target.checked)}
                type="checkbox"
              />
              Show technical names
            </label>
          </div>
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-100 p-4 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="size-5" /> Role access saved.
            </div>
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
                  Access related to {group.module.replaceAll("-", " ")} work.
                </p>
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
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-zinc-900/45 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-outline">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
