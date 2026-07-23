"use client";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Fingerprint,
  KeyRound,
  ListChecks,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  UserMinus,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/lib/auth-store";
import { EmployeeDevicePanel } from "@/features/platform/workspace-settings/device-management-view";
import { InternationalPhoneInput } from "@/shared/components/international-phone-input";
import {
  AdminPage,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";

type EmployeeDetail = {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string | null;
  workType: string;
  status: string;
  dateOfJoining: string;
  dateOfExit: string | null;
  department: { id: string; name: string };
  designation: { id: string; name: string } | null;
  manager: { id: string; employeeCode: string; fullName: string } | null;
  _count?: { reports: number };
};

type EmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
};

type OrganizationOption = { id: string; name: string };

type BiometricStatus = {
  consentActive: boolean;
  consentPolicyVersion: string | null;
  enrolled: boolean;
  version: number | null;
  enrolledAt: string | null;
  eligibleForFaceVerification: boolean;
};

type EmployeeWorkspace = {
  employee: EmployeeDetail & {
    user: {
      id: string;
      email: string;
      status: string;
      emailVerifiedAt: string | null;
      lastLoginAt: string | null;
      roles: Array<{ role: { id: string; name: string } }>;
    } | null;
  };
  assignments: {
    offices: Array<{
      id: string;
      isPrimary: boolean;
      office: { id: string; officeName: string; timezone: string | null };
    }>;
    defaultShift: {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
      isOvernight: boolean;
    } | null;
    upcomingRosters: Array<{
      id: string;
      rosterDate: string;
      shift: { id: string; name: string; startTime: string; endTime: string };
    }>;
    effectiveAttendancePolicy: {
      scope: string;
      policy: {
        id: string;
        name: string;
        locationMode: string;
        selfieMode: string;
        requireFaceMatch: boolean;
        requireRegisteredDevice: boolean;
        requireGeofence: boolean;
        fieldTrackingEnabled: boolean;
      };
    } | null;
    policyResolution: string | null;
  };
  attendance: {
    recentDays: Array<{
      id: string;
      attendanceDate: string;
      attendanceStatus: string;
      firstCheckin: string | null;
      lastCheckout: string | null;
      totalWorkMinutes: number;
      lateMinutes: number;
      overtimeMinutes: number;
    }>;
    resolvedExceptionCount: number;
  };
  leave: {
    balances: Array<{
      id: string;
      remainingDays: string;
      policy: { id: string; name: string; leaveType: string; version: number };
    }>;
    recentRequests: Array<{
      id: string;
      startDate: string;
      endDate: string;
      totalDays: string;
      status: string;
      policy: { id: string; name: string; leaveType: string };
    }>;
  };
  devices: Array<{
    id: string;
    deviceModel: string | null;
    platform: string;
    status: string;
    isPrimary: boolean;
    lastSeenAt: string | null;
  }>;
  history: {
    employmentEvents: Array<{
      id: string;
      eventType: string;
      effectiveDate: string;
      createdAt: string;
    }>;
    audit: Array<{
      id: string;
      action: string;
      module: string;
      createdAt: string;
      requestId: string | null;
    }>;
  };
  readiness: Record<string, boolean>;
};

type EmployeeTab =
  | "overview"
  | "assignments"
  | "attendance"
  | "leave"
  | "access"
  | "trust"
  | "documents"
  | "history";

function employeeTabFromParam(value: string | null): EmployeeTab {
  const aliases: Record<string, EmployeeTab> = {
    employment: "overview",
    account: "access",
    devices: "trust",
    biometrics: "trust",
  };
  const tabs: EmployeeTab[] = [
    "overview",
    "assignments",
    "attendance",
    "leave",
    "access",
    "trust",
    "documents",
    "history",
  ];
  const requested = aliases[value ?? ""] ?? value;
  return requested && tabs.includes(requested as EmployeeTab)
    ? (requested as EmployeeTab)
    : "overview";
}

export function EmployeeDetailView({ employeeId }: { employeeId: string }) {
  const searchParams = useSearchParams();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canReadBiometrics = permissions.includes("attendance.biometrics.read");
  const canManageBiometrics = permissions.includes(
    "attendance.biometrics.manage",
  );
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [workspace, setWorkspace] = useState<EmployeeWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState<EmployeeTab>(() =>
    employeeTabFromParam(searchParams.get("tab")),
  );
  const [biometrics, setBiometrics] = useState<BiometricStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const employeeResponse = await apiClient.get(
        `/employees/${employeeId}/workspace`,
      );
      setWorkspace(employeeResponse.data.data);
      setEmployee(employeeResponse.data.data.employee);
      if (canReadBiometrics) {
        await apiClient
          .get(`/face-enrollments/${employeeId}/status`)
          .then((response) => setBiometrics(response.data.data))
          .catch(() => setBiometrics(null));
      }
    } catch {
      setError("Employee details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiClient
      .get(`/employees/${employeeId}/workspace`)
      .then((employeeResponse) => {
        if (!active) return;
        setWorkspace(employeeResponse.data.data);
        setEmployee(employeeResponse.data.data.employee);
        if (canReadBiometrics) {
          void apiClient
            .get(`/face-enrollments/${employeeId}/status`)
            .then((biometricResponse) => {
              if (active) setBiometrics(biometricResponse.data.data);
            })
            .catch(() => {
              if (active) setBiometrics(null);
            });
        }
      })
      .catch(() => {
        if (active) setError("Employee details could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [employeeId, canReadBiometrics]);

  if (loading) {
    return (
      <AdminPage
        title="Employee profile"
        description="Loading employee identity and attendance access."
      >
        <LoadingState />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title={employee?.fullName || "Employee profile"}
      description={
        employee
          ? `${employee.employeeCode} · ${employee.workType}`
          : "Employee identity and attendance access."
      }
      action={
        <Link
          href="/app/employees"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-on-surface-variant"
        >
          <ArrowLeft className="size-4" /> Employees
        </Link>
      }
    >
      {error && <ErrorState message={error} />}
      {employee && workspace && (
        <EmployeeWorkspaceTabs
          active={activeTab}
          onChange={setActiveTab}
          permissions={permissions}
        />
      )}
      {employee && workspace && activeTab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
          <div className="grid gap-6">
            <EmploymentProfile employee={employee} />
            <ReadinessPanel
              readiness={workspace.readiness}
              onSelect={setActiveTab}
            />
            <EmployeeLifecyclePanel
              employee={workspace.employee}
              onComplete={load}
              permissions={permissions}
            />
          </div>
          <AccountSummary employee={workspace.employee} />
        </div>
      )}
      {employee && workspace && activeTab === "assignments" && (
        <AssignmentsPanel employeeId={employeeId} workspace={workspace} onUpdate={load} />
      )}
      {employee && workspace && activeTab === "attendance" && (
        <AttendancePanel employeeId={employeeId} workspace={workspace} />
      )}
      {employee && workspace && activeTab === "leave" && (
        <LeavePanel employeeId={employeeId} workspace={workspace} />
      )}
      {employee && workspace && activeTab === "access" && (
        <AccountPanel
          employee={workspace.employee}
          employeeId={employeeId}
          onAccountCreated={load}
          permissions={permissions}
        />
      )}
      {employee && workspace && activeTab === "history" && (
        <HistoryPanel employeeId={employeeId} />
      )}
      {employee && workspace && activeTab === "documents" && (
        <EmployeeDocumentsPanel employeeId={employeeId} />
      )}
      {employee && workspace && activeTab === "trust" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
          <div>
            <div className="mb-3">
              <h2 className="text-xl font-bold">Registered devices</h2>
              <p className="mt-1 text-sm text-outline">
                Approve, block, or replace devices with an auditable reason.
              </p>
            </div>
            <EmployeeDevicePanel employeeId={employeeId} />
          </div>

          <Panel className="h-fit p-6">
            <div className="grid size-12 place-items-center rounded-xl bg-zinc-50 text-primary">
              <Fingerprint className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Biometric identity</h2>
            {!canReadBiometrics ? (
              <p className="mt-3 text-sm text-outline">
                You do not have permission to view biometric enrollment status.
              </p>
            ) : biometrics ? (
              <>
                <div className="mt-5 grid gap-3">
                  <IdentityRow
                    label="Consent"
                    value={biometrics.consentActive ? "Active" : "Not active"}
                    positive={biometrics.consentActive}
                  />
                  <IdentityRow
                    label="Face profile"
                    value={
                      biometrics.enrolled
                        ? `Enrolled · v${biometrics.version}`
                        : "Not enrolled"
                    }
                    positive={biometrics.enrolled}
                  />
                  <IdentityRow
                    label="Face verification ready"
                    value={
                      biometrics.eligibleForFaceVerification ? "Yes" : "No"
                    }
                    positive={biometrics.eligibleForFaceVerification}
                  />
                </div>
                {biometrics.enrolledAt && (
                  <p className="mt-4 text-xs text-outline">
                    Enrolled {formatDate(biometrics.enrolledAt)}
                  </p>
                )}
                {canManageBiometrics && biometrics.enrolled && (
                  <button
                    type="button"
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-error px-4 text-sm font-semibold text-error"
                    onClick={() => setResetOpen(true)}
                  >
                    Reset face profile
                  </button>
                )}
              </>
            ) : (
              <LoadingState />
            )}
          </Panel>
        </div>
      )}
      {resetOpen && (
        <FaceResetDialog
          employeeId={employeeId}
          employeeName={employee?.fullName || "employee"}
          onClose={() => setResetOpen(false)}
          onComplete={async () => {
            setResetOpen(false);
            await load();
          }}
        />
      )}
    </AdminPage>
  );
}

function EmployeeWorkspaceTabs({
  active,
  onChange,
  permissions,
}: {
  active: EmployeeTab;
  onChange: (tab: EmployeeTab) => void;
  permissions: string[];
}) {
  const items: Array<{
    key: EmployeeTab;
    label: string;
    permissions?: string[];
  }> = [
    { key: "overview", label: "Overview" },
    { key: "assignments", label: "Assignments" },
    {
      key: "attendance",
      label: "Attendance",
      permissions: ["attendance.records.read", "attendance.records.self.read"],
    },
    {
      key: "leave",
      label: "Leave",
      permissions: ["leave.self", "leave.approve", "leave.manage"],
    },
    {
      key: "access",
      label: "Account access",
      permissions: ["identity.users.read", "organization.employees.self.read"],
    },
    {
      key: "trust",
      label: "Devices & biometrics",
      permissions: ["attendance.devices.read", "attendance.biometrics.read"],
    },
    {
      key: "documents",
      label: "Documents",
      permissions: [
        "organization.employee-documents.read",
        "organization.employee-documents.manage",
      ],
    },
    { key: "history", label: "History" },
  ];
  return (
    <nav
      aria-label="Employee workspace"
      className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-surface-variant bg-white p-2"
    >
      {items
        .filter(
          ({ permissions: required }) =>
            !required ||
            required.some((permission) => permissions.includes(permission)),
        )
        .map((item) => (
          <button
            aria-current={active === item.key ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active === item.key
                ? "bg-primary text-white"
                : "text-zinc-500 hover:bg-zinc-50"
            }`}
            key={item.key}
            onClick={() => onChange(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
    </nav>
  );
}

function EmploymentProfile({ employee }: { employee: EmployeeDetail }) {
  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-zinc-100 text-primary">
            <UserRound className="size-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Employment profile</h2>
            <p className="mt-1 text-sm text-outline">
              {employee.phone || "No phone number recorded"}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            employee.status === "TERMINATED"
              ? "bg-red-100 text-on-error-container"
              : employee.status === "ON_NOTICE"
                ? "bg-amber-100 text-amber-900"
                : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {employee.status}
        </span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail
          icon={Building2}
          label="Department"
          value={employee.department.name}
        />
        <Detail
          icon={BriefcaseBusiness}
          label="Designation"
          value={employee.designation?.name || "Not assigned"}
        />
        <Detail
          icon={UserRound}
          label="Manager"
          value={employee.manager?.fullName || "No manager"}
        />
        <Detail
          icon={CalendarDays}
          label="Joined"
          value={formatDate(employee.dateOfJoining)}
        />
      </div>
    </Panel>
  );
}

function EmployeeLifecyclePanel({
  employee,
  permissions,
  onComplete,
}: {
  employee: EmployeeWorkspace["employee"];
  permissions: string[];
  onComplete: () => Promise<void>;
}) {
  const canUpdate = permissions.includes("organization.employees.update");
  const canManageLifecycle = permissions.includes(
    "organization.employees.lifecycle",
  );
  const [dialog, setDialog] = useState<
    "edit" | "terminate" | "reactivate" | null
  >(null);

  if (!canUpdate && !canManageLifecycle) return null;
  const complete = async () => {
    setDialog(null);
    await onComplete();
  };
  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Employment actions</h2>
          <p className="mt-1 text-sm leading-6 text-outline">
            Update placement and record lifecycle changes here so history,
            access, policies, and payroll evidence remain connected.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate && employee.status !== "TERMINATED" && (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-primary"
              onClick={() => setDialog("edit")}
              type="button"
            >
              <Pencil className="size-4" /> Edit or transfer
            </button>
          )}
          {canManageLifecycle && employee.status !== "TERMINATED" && (
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-error bg-white px-4 text-sm font-semibold text-error"
              onClick={() => setDialog("terminate")}
              type="button"
            >
              <UserMinus className="size-4" /> End employment
            </button>
          )}
          {canManageLifecycle && employee.status === "TERMINATED" && (
            <PrimaryButton onClick={() => setDialog("reactivate")}>
              <RotateCcw className="size-4" /> Reactivate
            </PrimaryButton>
          )}
        </div>
      </div>
      {dialog === "edit" && (
        <EditEmployeeDialog
          employee={employee}
          onClose={() => setDialog(null)}
          onComplete={complete}
        />
      )}
      {dialog === "terminate" && (
        <TerminateEmployeeDialog
          employee={employee}
          onClose={() => setDialog(null)}
          onComplete={complete}
        />
      )}
      {dialog === "reactivate" && (
        <ReactivateEmployeeDialog
          employee={employee}
          onClose={() => setDialog(null)}
          onComplete={complete}
        />
      )}
    </Panel>
  );
}

function EditEmployeeDialog({
  employee,
  onClose,
  onComplete,
}: {
  employee: EmployeeWorkspace["employee"];
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [departments, setDepartments] = useState<OrganizationOption[]>([]);
  const [designations, setDesignations] = useState<OrganizationOption[]>([]);
  const [managers, setManagers] = useState<EmployeeOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: employee.fullName,
    email: employee.user?.email ?? "",
    phone: employee.phone ?? "",
    workType: employee.workType,
    deptId: employee.department.id,
    designationId: employee.designation?.id ?? "",
    managerId: employee.manager?.id ?? "",
    effectiveDate: today(),
  });

  useEffect(() => {
    Promise.all([
      apiClient.get("/departments"),
      apiClient.get("/designations?limit=100"),
      apiClient.get("/employees?status=ACTIVE&limit=100"),
    ])
      .then(([departmentResult, designationResult, employeeResult]) => {
        setDepartments(departmentResult.data.data);
        setDesignations(designationResult.data.data);
        setManagers(
          (employeeResult.data.data as EmployeeOption[]).filter(
            ({ id }) => id !== employee.id,
          ),
        );
      })
      .catch(() => setError("Organization options could not be loaded."));
  }, [employee.id]);

  async function save() {
    setSaving(true);
    setError("");
    const payload: Record<string, string | null> = {};
    const phone = form.phone.trim();
    if (form.fullName.trim() !== employee.fullName) {
      payload.fullName = form.fullName.trim();
    }
    const email = form.email.trim().toLowerCase();
    if (email !== (employee.user?.email ?? "").toLowerCase()) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        setError("Enter a valid employee email address.");
        setSaving(false);
        return;
      }
      payload.email = email;
    }
    if (phone !== (employee.phone ?? "")) {
      if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
        setError(
          "Phone must include the country code in E.164 format, for example +96891234567.",
        );
        setSaving(false);
        return;
      }
      payload.phone = phone || null;
    }
    if (form.deptId !== employee.department.id) {
      payload.deptId = form.deptId;
    }
    if (form.designationId !== (employee.designation?.id ?? "")) {
      payload.designationId = form.designationId || null;
    }
    if (form.managerId !== (employee.manager?.id ?? "")) {
      payload.managerId = form.managerId || null;
    }
    if (form.workType !== employee.workType) {
      payload.workType = form.workType;
    }
    if (!Object.keys(payload).length) {
      setError("No employment changes to save.");
      setSaving(false);
      return;
    }
    payload.effectiveDate = form.effectiveDate;
    try {
      await apiClient.patch(`/employees/${employee.id}`, payload);
      await onComplete();
    } catch (caught) {
      setError(apiMessage(caught, "Employment details could not be updated."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <EmployeeActionDialog
      description="Update employee identity, login email and employment placement. Organization changes are recorded in employment history."
      onClose={onClose}
      title="Edit employee"
    >
      {error && <ErrorState message={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            className={inputClass}
            value={form.fullName}
            onChange={(event) =>
              setForm({ ...form, fullName: event.target.value })
            }
          />
        </Field>
        <Field label="Phone">
          <InternationalPhoneInput
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
          <span className="text-xs leading-5 text-outline">
            Select the country code, then enter the local mobile number.
          </span>
        </Field>
        <Field label="Work email">
          <input
            className={inputClass}
            disabled={!employee.user}
            placeholder="employee@company.com"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
          <span className="text-xs leading-5 text-outline">
            {employee.user
              ? "This is the email used to sign in to the employee app."
              : "This legacy employee has no login account yet. Create it from Account access."}
          </span>
        </Field>
        <Field label="Department">
          <select
            className={inputClass}
            value={form.deptId}
            onChange={(event) =>
              setForm({ ...form, deptId: event.target.value })
            }
          >
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
            onChange={(event) =>
              setForm({ ...form, designationId: event.target.value })
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
        <Field label="Manager">
          <select
            className={inputClass}
            value={form.managerId}
            onChange={(event) =>
              setForm({ ...form, managerId: event.target.value })
            }
          >
            <option value="">No manager</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.fullName} ({manager.employeeCode})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Work type">
          <select
            className={inputClass}
            value={form.workType}
            onChange={(event) =>
              setForm({ ...form, workType: event.target.value })
            }
          >
            <option value="OFFICE">Office</option>
            <option value="FIELD">Field</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </Field>
        <Field label="Effective date">
          <input
            className={inputClass}
            type="date"
            value={form.effectiveDate}
            onChange={(event) =>
              setForm({ ...form, effectiveDate: event.target.value })
            }
          />
        </Field>
      </div>
      <DialogActions
        busy={saving}
        confirmLabel="Save employment change"
        onCancel={onClose}
        onConfirm={save}
      />
    </EmployeeActionDialog>
  );
}

function TerminateEmployeeDialog({
  employee,
  onClose,
  onComplete,
}: {
  employee: EmployeeDetail;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [exitDate, setExitDate] = useState(today());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function terminate() {
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/employees/${employee.id}/terminate`, {
        exitDate,
        reason: reason || undefined,
      });
      await onComplete();
    } catch (caught) {
      setError(apiMessage(caught, "Employment could not be ended."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <EmployeeActionDialog
      description="This records the employee exit, removes them from active workforce counts, updates subscribed seat usage, and preserves their history."
      onClose={onClose}
      title={`End employment for ${employee.fullName}`}
      tone="danger"
    >
      {error && <ErrorState message={error} />}
      <div className="grid gap-4">
        <Field label="Last working date">
          <input
            className={inputClass}
            min={employee.dateOfJoining.slice(0, 10)}
            onChange={(event) => setExitDate(event.target.value)}
            type="date"
            value={exitDate}
          />
        </Field>
        <Field label="Reason">
          <textarea
            className={`${inputClass} min-h-24 py-3`}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Voluntary resignation, contract completed, or another auditable reason"
            value={reason}
          />
        </Field>
      </div>
      <DialogActions
        busy={saving}
        confirmLabel="Confirm end of employment"
        danger
        onCancel={onClose}
        onConfirm={terminate}
      />
    </EmployeeActionDialog>
  );
}

function ReactivateEmployeeDialog({
  employee,
  onClose,
  onComplete,
}: {
  employee: EmployeeDetail;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function reactivate() {
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/employees/${employee.id}/reactivate`, {
        effectiveDate,
      });
      await onComplete();
    } catch (caught) {
      setError(
        apiMessage(
          caught,
          "The employee could not be reactivated. Check workspace capacity.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <EmployeeActionDialog
      description="Reactivation is quota-checked and returns this employee to active workforce and subscription seat counts. Review assignments after completion."
      onClose={onClose}
      title={`Reactivate ${employee.fullName}`}
    >
      {error && <ErrorState message={error} />}
      <Field label="Effective date">
        <input
          className={inputClass}
          onChange={(event) => setEffectiveDate(event.target.value)}
          type="date"
          value={effectiveDate}
        />
      </Field>
      <DialogActions
        busy={saving}
        confirmLabel="Reactivate employee"
        onCancel={onClose}
        onConfirm={reactivate}
      />
    </EmployeeActionDialog>
  );
}

function ReadinessPanel({
  readiness,
  onSelect,
}: {
  readiness: Record<string, boolean>;
  onSelect: (tab: EmployeeTab) => void;
}) {
  const steps: Record<
    string,
    { title: string; description: string; tab: EmployeeTab; action: string }
  > = {
    accountLinked: {
      title: "Create employee login",
      description: "Invite the employee so they can use the app and self-service.",
      tab: "access",
      action: "Open account access",
    },
    managerAssigned: {
      title: "Assign reporting manager",
      description: "Needed for manager approvals and team visibility.",
      tab: "overview",
      action: "Review employment",
    },
    officeAssigned: {
      title: "Assign workplace",
      description: "Select the office or work location used for attendance.",
      tab: "assignments",
      action: "Open assignments",
    },
    shiftAssigned: {
      title: "Assign shift or roster",
      description: "Defines expected start, end and working days.",
      tab: "assignments",
      action: "Open assignments",
    },
    attendancePolicyAssigned: {
      title: "Apply attendance policy",
      description: "Controls location, selfie and registered-device requirements.",
      tab: "assignments",
      action: "Open assignments",
    },
    approvedDevice: {
      title: "Approve employee device",
      description: "Required only when the selected policy enforces device trust.",
      tab: "trust",
      action: "Open devices",
    },
  };
  const complete = Object.values(readiness).filter(Boolean).length;
  const total = Object.values(readiness).length;
  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Employee setup checklist</h2>
          <p className="mt-1 text-sm text-outline">
            Complete these steps before the employee starts using attendance.
          </p>
        </div>
        <span className="rounded-full bg-zinc-50 px-3 py-1 text-sm font-bold text-primary">
          {complete}/{total}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(readiness).map(([key, ready]) => {
          const step = steps[key] ?? {
            title: key
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .replace(/^./, (letter) => letter.toUpperCase()),
            description: "Complete this employee setup requirement.",
            tab: "overview" as EmployeeTab,
            action: "Review",
          };
          return (
          <button
            className="flex items-start gap-3 rounded-xl bg-zinc-50 p-4 text-left text-sm transition hover:bg-zinc-50"
            key={key}
            onClick={() => onSelect(step.tab)}
            type="button"
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                ready
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {ready ? "Y" : "!"}
            </span>
            <span>
              <strong className="block text-zinc-800">{step.title}</strong>
              <span className="mt-1 block text-xs leading-5 text-outline">
                {ready ? "Complete" : step.description}
              </span>
              {!ready && (
                <span className="mt-2 block text-xs font-bold text-primary">
                  {step.action} →
                </span>
              )}
            </span>
          </button>
          );
        })}
      </div>
    </Panel>
  );
}

function AccountSummary({
  employee,
}: {
  employee: EmployeeWorkspace["employee"];
}) {
  return (
    <Panel className="h-fit p-6">
      <div className="grid size-12 place-items-center rounded-xl bg-zinc-50 text-primary">
        <KeyRound className="size-6" />
      </div>
      <h2 className="mt-5 text-xl font-bold">Account access</h2>
      {employee.user ? (
        <div className="mt-5 grid gap-3">
          <IdentityRow label="Email" positive value={employee.user.email} />
          <IdentityRow
            label="Status"
            positive={employee.user.status === "ACTIVE"}
            value={employee.user.status}
          />
          <IdentityRow
            label="Email verified"
            positive={Boolean(employee.user.emailVerifiedAt)}
            value={employee.user.emailVerifiedAt ? "Yes" : "No"}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-outline">
          No login account is linked yet. Create it from the Account access tab.
        </p>
      )}
    </Panel>
  );
}

function AssignmentsPanel({
  employeeId,
  workspace,
  onUpdate,
}: {
  employeeId: string;
  workspace: EmployeeWorkspace;
  onUpdate: () => void;
}) {
  const policy = workspace.assignments.effectiveAttendancePolicy;
  const [editing, setEditing] = useState(false);
  
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Work assignments</h2>
          <button 
            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-200"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3" /> Edit
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          <AssignmentRow
            label="Primary office"
            value={
              workspace.assignments.offices.find(({ isPrimary }) => isPrimary)
                ?.office.officeName ??
              workspace.assignments.offices[0]?.office.officeName ??
              "Not assigned"
            }
          />
          <AssignmentRow
            label="Default shift"
            value={workspace.assignments.defaultShift?.name ?? "Not assigned"}
          />
          <AssignmentRow
            label="Upcoming roster entries"
            value={String(workspace.assignments.upcomingRosters.length)}
          />
          {workspace.assignments.offices.map(({ office, isPrimary }) => (
            <AssignmentRow
              key={office.id}
              label={isPrimary ? "Primary office detail" : "Additional office"}
              value={`${office.officeName}${office.timezone ? ` · ${office.timezone}` : ""}`}
            />
          ))}
          {workspace.assignments.upcomingRosters.slice(0, 5).map((roster) => (
            <AssignmentRow
              key={roster.id}
              label={formatDate(roster.rosterDate)}
              value={`${roster.shift.name} · ${roster.shift.startTime}–${roster.shift.endTime}`}
            />
          ))}
        </div>
        <Link
          className="mt-5 inline-flex text-sm font-bold text-primary"
          href="/app/attendance/rosters"
        >
          Manage shifts and rosters
        </Link>
      </Panel>
      <Panel className="p-6">
        <h2 className="text-lg font-bold">Effective Attendance policy</h2>
        {policy ? (
          <div className="mt-5 grid gap-3">
            <AssignmentRow label="Policy" value={policy.policy.name} />
            <AssignmentRow
              label="Resolved from"
              value={policy.scope.replaceAll("_", " ")}
            />
            <AssignmentRow
              label="Location"
              value={policy.policy.locationMode.replaceAll("_", " ")}
            />
            <AssignmentRow
              label="Selfie"
              value={policy.policy.selfieMode.replaceAll("_", " ")}
            />
            <AssignmentRow
              label="Device"
              value={
                policy.policy.requireRegisteredDevice ? "Required" : "Optional"
              }
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-900">
            No tenant, department, or employee policy currently resolves for
            this employee.
          </p>
        )}
        <Link
          className="mt-5 inline-flex text-sm font-bold text-primary"
          href={`/app/attendance/policies?employeeId=${employeeId}&returnTo=${encodeURIComponent(`/app/employees/${employeeId}?tab=assignments`)}`}
        >
          Change this employee&apos;s policy
        </Link>
      </Panel>
      <Panel className="p-6 lg:col-span-2">
        <h2 className="text-lg font-bold">Assigned Leave policies</h2>
        <p className="mt-1 text-sm text-outline">
          A balance confirms the employee is assigned to that versioned Leave
          policy.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {workspace.leave.balances.length ? (
            workspace.leave.balances.map((balance) => (
              <AssignmentRow
                key={balance.id}
                label={`${balance.policy.name} · ${balance.policy.leaveType}`}
                value={`Version ${balance.policy.version} · ${balance.remainingDays} days remaining`}
              />
            ))
          ) : (
            <p className="text-sm text-amber-900">
              No Leave policy balance is assigned to this employee.
            </p>
          )}
        </div>
        <Link
          className="mt-5 inline-flex text-sm font-bold text-primary"
          href="/app/attendance/setup/leave"
        >
          Manage Leave policies
        </Link>
      </Panel>
      {editing && (
        <EditAssignmentsModal
          employeeId={employeeId}
          currentPrimaryOfficeId={workspace.assignments.offices.find(o => o.isPrimary)?.office.id ?? null}
          currentDefaultShiftId={workspace.assignments.defaultShift?.id ?? null}
          onClose={() => setEditing(false)}
          onSuccess={() => {
            setEditing(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function AttendancePanel({
  employeeId,
  workspace,
}: {
  employeeId: string;
  workspace: EmployeeWorkspace;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-lg font-bold">Recent Attendance</h2>
          <p className="mt-1 text-sm text-outline">
            Latest calculated days, late time, and overtime.
          </p>
        </div>
        <Link
          className="text-sm font-bold text-primary"
          href={`/app/attendance/register/${employeeId}`}
        >
          Open full register
        </Link>
      </div>
      {workspace.attendance.recentDays.length ? (
        workspace.attendance.recentDays.map((day) => (
          <div
            className="grid gap-2 border-t border-surface-variant px-6 py-4 text-sm sm:grid-cols-[140px_1fr_120px_120px]"
            key={day.id}
          >
            <span>{formatDate(day.attendanceDate)}</span>
            <strong>{day.attendanceStatus.replaceAll("_", " ")}</strong>
            <span>{day.totalWorkMinutes} min</span>
            <span>{day.overtimeMinutes} min OT</span>
          </div>
        ))
      ) : (
        <p className="border-t border-surface-variant p-6 text-sm text-outline">
          No calculated Attendance days are available yet.
        </p>
      )}
    </Panel>
  );
}

function LeavePanel({
  employeeId,
  workspace,
}: {
  employeeId: string;
  workspace: EmployeeWorkspace;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel className="p-6">
        <h2 className="text-lg font-bold">Leave balances</h2>
        <div className="mt-4 grid gap-3">
          {workspace.leave.balances.length ? (
            workspace.leave.balances.map((balance) => (
              <AssignmentRow
                key={balance.id}
                label={balance.policy.name}
                value={`${balance.remainingDays} days`}
              />
            ))
          ) : (
            <p className="text-sm text-outline">No balances assigned.</p>
          )}
        </div>
      </Panel>
      <Panel className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Recent requests</h2>
          <Link
            className="text-sm font-bold text-primary"
            href={`/app/attendance/leave/requests?employeeId=${employeeId}&returnTo=/app/employees/${employeeId}`}
          >
            Open full history
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {workspace.leave.recentRequests.length ? (
            workspace.leave.recentRequests.map((request) => (
              <div className="rounded-xl bg-zinc-50 p-4" key={request.id}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{request.policy.name}</strong>
                  <span className="text-xs font-bold">{request.status}</span>
                </div>
                <p className="mt-1 text-xs text-outline">
                  {formatDate(request.startDate)} to{" "}
                  {formatDate(request.endDate)} · {request.totalDays} days
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-outline">No leave requests yet.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function AccountPanel({
  employee,
  employeeId,
  onAccountCreated,
  permissions,
}: {
  employee: EmployeeWorkspace["employee"];
  employeeId: string;
  onAccountCreated: () => Promise<void>;
  permissions: string[];
}) {
  const canCreateAccount = permissions.includes("organization.employees.update");
  const [accountOpen, setAccountOpen] = useState(false);
  const elevatedRoles =
    employee.user?.roles.filter(({ role }) => role.name !== "EMPLOYEE") ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        <AccountSummary employee={employee} />
        {!employee.user && canCreateAccount && (
          <Panel className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">Create employee login</h2>
                <p className="mt-1 text-sm leading-6 text-outline">
                  Enter the work email. DeltCRM will create the Employee login
                  and generate a temporary password immediately.
                </p>
              </div>
              <PrimaryButton onClick={() => setAccountOpen(true)}>
                <KeyRound className="size-4" /> Create login
              </PrimaryButton>
            </div>
          </Panel>
        )}
      </div>
      <Panel className="p-6">
        <h2 className="text-lg font-bold">Employee access</h2>
        {employee.user ? (
          <div className="mt-4 grid gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-900">
                Employee self-service active
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-900">
                The Employee role was assigned automatically when this login
                was created.
              </p>
            </div>
            {elevatedRoles.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-outline">
                  Additional access
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {elevatedRoles.map(({ role }) => (
                    <span
                      className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-primary"
                      key={role.id}
                    >
                      {role.name.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">Not activated</p>
            <p className="mt-1 text-xs leading-5 text-amber-900">
              Create the employee login here. The Employee role is assigned
              automatically; no separate role setup is required.
            </p>
          </div>
        )}
      </Panel>
      {accountOpen && (
        <CreateEmployeeAccountDialog
          employeeId={employeeId}
          employeeName={employee.fullName}
          onClose={() => setAccountOpen(false)}
          onCreated={onAccountCreated}
        />
      )}
    </div>
  );
}

function CreateEmployeeAccountDialog({
  employeeId,
  employeeName,
  onClose,
  onCreated,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function createAccount() {
    setSaving(true);
    setError("");
    try {
      const { data } = await apiClient.post<{
        temporaryCredentials: { email: string; password: string };
      }>(`/employees/${employeeId}/account`, { email });
      setCredentials(data.temporaryCredentials);
    } catch (caught) {
      setError(
        apiMessage(
          caught,
          "Employee login could not be created. Check the email and phone number.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <EmployeeActionDialog
      description={`Create the mobile and self-service login for ${employeeName}. The Employee role is assigned automatically.`}
      onClose={onClose}
      title="Create employee login"
    >
      {credentials ? (
        <div className="grid gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Login created successfully. Give these temporary credentials to the
            employee.
          </div>
          <Field label="Login email">
            <input className={inputClass} readOnly value={credentials.email} />
          </Field>
          <Field label="Temporary password">
            <input
              className={inputClass}
              readOnly
              value={credentials.password}
            />
          </Field>
          <PrimaryButton
            onClick={() => {
              onClose();
              void onCreated();
            }}
          >
            Done
          </PrimaryButton>
        </div>
      ) : (
        <div className="grid gap-4">
          {error && <ErrorState message={error} />}
          <Field label="Employee work email">
            <input
              autoFocus
              className={inputClass}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </Field>
          <div className="rounded-lg bg-zinc-50 p-4 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-outline">
              Account role
            </span>
            <strong className="mt-1 block">Employee self-service</strong>
            <span className="mt-1 block text-xs leading-5 text-outline">
              Attendance, leave, notifications, and the employee&apos;s own
              profile only. Additional HR access can be granted later.
            </span>
          </div>
          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            The temporary password is the employee name plus the first six
            phone digits. It is shown after account creation.
          </p>
          <DialogActions
            busy={saving}
            confirmDisabled={!email}
            confirmLabel="Create login"
            onCancel={onClose}
            onConfirm={createAccount}
          />
        </div>
      )}
    </EmployeeActionDialog>
  );
}

type EmployeeHistoryCategory =
  | "LIFECYCLE"
  | "PROFILE"
  | "ACCESS"
  | "ASSIGNMENT"
  | "ATTENDANCE"
  | "LEAVE"
  | "TRUST"
  | "DOCUMENT"
  | "SECURITY";

type EmployeeHistoryItem = {
  id: string;
  occurredAt: string;
  effectiveAt: string | null;
  category: EmployeeHistoryCategory;
  action: string;
  title: string;
  actor: {
    userId: string;
    displayName: string | null;
    email: string;
  } | null;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
  requestId: string | null;
  impersonated: boolean;
};

type EmployeeHistoryResponse = {
  data: EmployeeHistoryItem[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

const HISTORY_CATEGORIES: Array<{
  value: "ALL" | EmployeeHistoryCategory;
  label: string;
}> = [
  { value: "ALL", label: "All activity" },
  { value: "PROFILE", label: "Profile" },
  { value: "ASSIGNMENT", label: "Assignments" },
  { value: "ACCESS", label: "Access" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "LEAVE", label: "Leave" },
  { value: "TRUST", label: "Devices & biometrics" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "LIFECYCLE", label: "Lifecycle" },
  { value: "SECURITY", label: "Security" },
];

function HistoryPanel({ employeeId }: { employeeId: string }) {
  const [category, setCategory] = useState<
    "ALL" | EmployeeHistoryCategory
  >("ALL");
  const [entries, setEntries] = useState<EmployeeHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const params = new URLSearchParams({ limit: "25" });
    if (category !== "ALL") params.set("category", category);
    apiClient
      .get<EmployeeHistoryResponse>(
        `/employees/${employeeId}/history?${params.toString()}`,
      )
      .then(({ data }) => {
        if (!active) return;
        setEntries(data.data);
        setNextCursor(data.pagination.nextCursor);
      })
      .catch((requestError) => {
        if (!active) return;
        setEntries([]);
        setNextCursor(null);
        setError(
          getApiErrorMessage(
            requestError,
            "Employee history could not be loaded.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, employeeId]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "25",
        cursor: nextCursor,
      });
      if (category !== "ALL") params.set("category", category);
      const { data } = await apiClient.get<EmployeeHistoryResponse>(
        `/employees/${employeeId}/history?${params.toString()}`,
      );
      setEntries((current) => [
        ...current,
        ...data.data.filter(
          (item) => !current.some((entry) => entry.id === item.id),
        ),
      ]);
      setNextCursor(data.pagination.nextCursor);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "More employee history could not be loaded.",
        ),
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListChecks className="size-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">Employee history</h2>
            <p className="text-sm text-outline">
              A chronological audit trail of changes related to this employee.
            </p>
          </div>
        </div>
        <Field label="Activity type">
          <select
            className={`${inputClass} min-w-52`}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setCategory(
                event.target.value as "ALL" | EmployeeHistoryCategory,
              );
            }}
            value={category}
          >
            {HISTORY_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      <div className="mt-5 grid gap-3">
        {loading ? (
          <LoadingState />
        ) : entries.length ? (
          entries.map((entry) => (
            <div
              className="rounded-xl border border-surface-variant p-4"
              key={entry.id}
            >
              <div className="flex items-start gap-4">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{entry.title}</p>
                    <span className="rounded-full bg-zinc-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-outline">
                      {historyCategoryLabel(entry.category)}
                    </span>
                    {entry.impersonated && (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">
                        Impersonated
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-outline">
                    {entry.actor
                      ? `By ${entry.actor.displayName || entry.actor.email}`
                      : "System activity"}{" "}
                    · {formatDateTime(entry.occurredAt)}
                    {entry.effectiveAt
                      ? ` · Effective ${formatDate(entry.effectiveAt)}`
                      : ""}
                  </p>
                  {entry.changes.length > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {entry.changes.slice(0, 6).map((change) => (
                        <div
                          className="rounded-lg bg-zinc-50 px-3 py-2 text-xs"
                          key={change.field}
                        >
                          <strong className="block capitalize">
                            {change.field.replaceAll("_", " ")}
                          </strong>
                          <span className="mt-1 block break-words text-outline">
                            {formatHistoryValue(change.from)} →{" "}
                            {formatHistoryValue(change.to)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.requestId && (
                    <p className="mt-2 break-all text-[10px] text-outline">
                      Request: {entry.requestId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-surface-variant p-8 text-center">
            <p className="text-sm font-semibold">No matching activity</p>
            <p className="mt-1 text-xs text-outline">
              New employee actions will appear here automatically.
            </p>
          </div>
        )}
      </div>
      {nextCursor && !loading && (
        <button
          className="mt-5 w-full rounded-xl border border-surface-variant px-4 py-3 text-sm font-semibold text-primary disabled:opacity-50"
          disabled={loadingMore}
          onClick={loadMore}
          type="button"
        >
          {loadingMore ? "Loading more..." : "Load more activity"}
        </button>
      )}
    </Panel>
  );
}

type EmployeeDocument = {
  id: string;
  documentType: string;
  title: string;
  filename: string;
  contentType: string;
  fileSize: number;
  expiresAt: string | null;
  createdAt: string;
};

type DocumentUploadStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "registering"
  | "refreshing";

function EmployeeDocumentsPanel({ employeeId }: { employeeId: string }) {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canManage = permissions.includes(
    "organization.employee-documents.manage",
  );
  const [documents, setDocuments] = useState<EmployeeDocument[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("EMPLOYMENT");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadStage, setUploadStage] =
    useState<DocumentUploadStage>("idle");
  const [error, setError] = useState("");

  const load = () =>
    apiClient
      .get<{ data: EmployeeDocument[] }>(`/employees/${employeeId}/documents`)
      .then(({ data }) => setDocuments(data.data))
      .catch(() => setError("Employee documents could not be loaded."));
  useEffect(() => {
    apiClient
      .get<{ data: EmployeeDocument[] }>(`/employees/${employeeId}/documents`)
      .then(({ data }) => setDocuments(data.data))
      .catch(() => setError("Employee documents could not be loaded."));
  }, [employeeId]);

  async function upload() {
    if (!file || title.trim().length < 2) return;
    let currentStage: DocumentUploadStage = "preparing";
    setBusy(true);
    setError("");
    try {
      setUploadStage(currentStage);
      const { data: presignResponse } = await apiClient.post<{
        data: {
          objectKey: string;
          uploadUrl: string;
          headers: Record<string, string>;
        };
      }>(`/employees/${employeeId}/documents/presign`, {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      if (!presignResponse.data.uploadUrl.startsWith("memory:")) {
        currentStage = "uploading";
        setUploadStage(currentStage);
        let uploadResponse: Response;
        try {
          uploadResponse = await fetch(presignResponse.data.uploadUrl, {
            method: "PUT",
            headers: presignResponse.data.headers,
            body: file,
          });
        } catch {
          throw new Error(
            "The private file store could not be reached. Check its browser URL and CORS configuration.",
          );
        }
        if (!uploadResponse.ok) {
          throw new Error(
            `The private file store rejected the upload (HTTP ${uploadResponse.status}).`,
          );
        }
      }
      currentStage = "registering";
      setUploadStage(currentStage);
      await apiClient.post(`/employees/${employeeId}/documents`, {
        objectKey: presignResponse.data.objectKey,
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        title: title.trim(),
        documentType,
        ...(expiresAt ? { expiresAt } : {}),
      });
      setFile(null);
      setTitle("");
      setExpiresAt("");
      currentStage = "refreshing";
      setUploadStage(currentStage);
      await load();
    } catch (cause) {
      const fallbackByStage: Record<DocumentUploadStage, string> = {
        idle: "The document could not be uploaded.",
        preparing:
          "The upload could not be prepared. Check the file type, size, and your permission.",
        uploading:
          "The private file store could not receive the document. Please retry.",
        registering:
          "The file was transferred but could not be registered. Please retry the upload.",
        refreshing:
          "The document was saved, but the list could not be refreshed.",
      };
      setError(getApiErrorMessage(cause, fallbackByStage[currentStage]));
    } finally {
      setBusy(false);
      setUploadStage("idle");
    }
  }

  async function download(document: EmployeeDocument) {
    try {
      const { data } = await apiClient.get<{ data: { url: string } }>(
        `/employees/${employeeId}/documents/${document.id}/download`,
      );
      window.location.assign(data.data.url);
    } catch {
      setError("A private download link could not be created.");
    }
  }

  async function remove(document: EmployeeDocument) {
    if (!window.confirm(`Permanently delete ${document.title}?`)) return;
    await apiClient
      .delete(`/employees/${employeeId}/documents/${document.id}`)
      .then(load)
      .catch(() => setError("The document could not be deleted."));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      {canManage && (
        <Panel className="h-fit p-6">
          <div className="grid size-11 place-items-center rounded-xl bg-zinc-100 text-primary">
            <Upload className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Add document</h2>
          <p className="mt-1 text-sm leading-6 text-outline">
            Files are private. Only authorized HR users receive short-lived
            download links, and every upload or deletion is audited.
          </p>
          <div className="mt-5 grid gap-4">
            <Field label="Document title">
              <input
                className={inputClass}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </Field>
            <Field label="Document type">
              <select
                className={inputClass}
                onChange={(event) => setDocumentType(event.target.value)}
                value={documentType}
              >
                <option value="EMPLOYMENT">Employment</option>
                <option value="IDENTITY">Identity</option>
                <option value="CERTIFICATION">Certification</option>
                <option value="POLICY">Policy acknowledgement</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Expiry date (optional)">
              <input
                className={inputClass}
                onChange={(event) => setExpiresAt(event.target.value)}
                type="date"
                value={expiresAt}
              />
            </Field>
            <Field label="Private file">
              <input
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="block w-full text-sm"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
            {file && (
              <div className="rounded-xl border border-surface-variant bg-zinc-50 p-3 text-xs text-on-surface-variant">
                <strong className="block truncate text-sm text-on-surface">
                  {file.name}
                </strong>
                {file.type || "Unknown file type"} ·{" "}
                {formatFileSize(file.size)}
              </div>
            )}
            {!file && (
              <p className="text-xs text-outline">
                Select a PDF, PNG, JPEG, or WebP file under 10 MB.
              </p>
            )}
            {error && <ErrorState message={error} />}
            <PrimaryButton
              disabled={busy || !file || title.trim().length < 2}
              onClick={upload}
            >
              {busy
                ? documentUploadStageLabel(uploadStage)
                : "Upload document"}
            </PrimaryButton>
            {!busy && title.trim().length < 2 && (
              <p className="text-xs text-outline">
                Enter a document title with at least two characters to enable
                upload.
              </p>
            )}
          </div>
        </Panel>
      )}
      <Panel className="overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold">Employee documents</h2>
          <p className="mt-1 text-sm text-outline">
            Review metadata before opening a private file. Delete only according
            to your company retention policy.
          </p>
        </div>
        {error && !canManage && (
          <div className="px-6 pb-4">
            <ErrorState message={error} />
          </div>
        )}
        {!documents ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : documents.length ? (
          documents.map((document) => (
            <div
              className="grid gap-3 border-t border-surface-variant p-5 sm:grid-cols-[1fr_150px_auto] sm:items-center"
              key={document.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-50 text-primary">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-sm">
                    {document.title}
                  </strong>
                  <span className="block truncate text-xs text-outline">
                    {document.filename} · {formatFileSize(document.fileSize)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-outline">
                <strong className="block text-on-surface-variant">
                  {document.documentType.replaceAll("_", " ")}
                </strong>
                {document.expiresAt
                  ? `Expires ${formatDate(document.expiresAt)}`
                  : "No expiry"}
              </div>
              <div className="flex gap-2">
                <button
                  aria-label={`Download ${document.title}`}
                  className="grid size-10 place-items-center rounded-lg border border-zinc-300 text-primary"
                  onClick={() => download(document)}
                  type="button"
                >
                  <Download className="size-4" />
                </button>
                {canManage && (
                  <button
                    aria-label={`Delete ${document.title}`}
                    className="grid size-10 place-items-center rounded-lg border border-red-300 text-error"
                    onClick={() => remove(document)}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="border-t border-surface-variant p-6 text-sm text-outline">
            No private documents are stored for this employee yet.
          </p>
        )}
      </Panel>
    </div>
  );
}

function documentUploadStageLabel(stage: DocumentUploadStage) {
  const labels: Record<DocumentUploadStage, string> = {
    idle: "Uploading...",
    preparing: "Preparing secure upload...",
    uploading: "Uploading private file...",
    registering: "Saving document record...",
    refreshing: "Refreshing documents...",
  };
  return labels[stage];
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function EmployeeActionDialog({
  title,
  description,
  onClose,
  tone = "default",
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-zinc-900/55 p-4"
      role="dialog"
    >
      <section className="my-6 max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start gap-4">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${
              tone === "danger"
                ? "bg-error-container text-on-error-container"
                : "bg-zinc-50 text-primary"
            }`}
          >
            {tone === "danger" ? (
              <UserMinus className="size-5" />
            ) : (
              <BriefcaseBusiness className="size-5" />
            )}
          </span>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              {description}
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-lg text-outline hover:bg-zinc-50"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function DialogActions({
  busy,
  confirmLabel,
  confirmDisabled = false,
  danger = false,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  confirmLabel: string;
  confirmDisabled?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button
        className="min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-semibold"
        disabled={busy}
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
      <button
        className={`min-h-11 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50 ${
          danger ? "bg-error" : "bg-primary"
        }`}
        disabled={busy || confirmDisabled}
        onClick={() => void onConfirm()}
        type="button"
      >
        {busy ? "Saving..." : confirmLabel}
      </button>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function apiMessage(error: unknown, fallback: string) {
  const data = (
    error as {
      response?: {
        data?: {
          message?: unknown;
          details?: Array<{ field?: string; messages?: string[] }>;
        };
      };
    }
  )?.response?.data;
  const details = data?.details
    ?.flatMap(({ field, messages }) =>
      (messages ?? []).map((message) =>
        field ? `${sentenceLabel(field)}: ${message}` : message,
      ),
    )
    .join(" ");
  if (details) return details;
  const message = data?.message;
  return typeof message === "string" ? message : fallback;
}

function sentenceLabel(value: string) {
  const label = value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll(".", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function AssignmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 p-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <strong className="text-right text-sm">{value}</strong>
    </div>
  );
}

function FaceResetDialog({
  employeeId,
  employeeName,
  onClose,
  onComplete,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function reset() {
    if (reason.trim().length < 5) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/face-enrollments/${employeeId}/reset`, {
        reason: reason.trim(),
      });
      await onComplete();
    } catch {
      setError("The face profile could not be reset. Refresh and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-zinc-900/55 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Panel className="w-full max-w-lg p-6 shadow-2xl">
        <div className="grid size-12 place-items-center rounded-xl bg-error-container text-on-error-container">
          <Fingerprint className="size-6" />
        </div>
        <h2 className="mt-5 text-xl font-bold">
          Reset {employeeName}’s face profile?
        </h2>
        <p className="mt-2 text-sm text-outline">
          Existing biometric evidence will be revoked and deleted. The employee
          must complete enrollment again.
        </p>
        <div className="mt-5 grid gap-4">
          <Field label="Reset reason">
            <textarea
              className={`${inputClass} min-h-28 py-3`}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {error && <ErrorState message={error} />}
          <div className="flex gap-3">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl border border-zinc-300 px-4 text-sm font-semibold"
              onClick={onClose}
            >
              Cancel
            </button>
            <PrimaryButton
              className="flex-1"
              disabled={saving || reason.trim().length < 5}
              onClick={() => void reset()}
            >
              {saving ? "Resetting…" : "Reset profile"}
            </PrimaryButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-outline">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function IdentityRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 p-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span
        className={`inline-flex items-center gap-1 text-sm font-bold ${positive ? "text-emerald-900" : "text-amber-900"}`}
      >
        {positive && <ShieldCheck className="size-4" />} {value}
      </span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function historyCategoryLabel(category: EmployeeHistoryCategory) {
  return (
    HISTORY_CATEGORIES.find((option) => option.value === category)?.label ??
    category
  );
}

function formatHistoryValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "Updated";
  }
}
function EditAssignmentsModal({
  employeeId,
  currentPrimaryOfficeId,
  currentDefaultShiftId,
  onClose,
  onSuccess,
}: {
  employeeId: string;
  currentPrimaryOfficeId: string | null;
  currentDefaultShiftId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [offices, setOffices] = useState<
    Array<{ id: string; officeName: string }>
  >([]);
  const [shifts, setShifts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    primaryOfficeId: currentPrimaryOfficeId || "",
    defaultShiftId: currentDefaultShiftId || "",
  });

  useEffect(() => {
    Promise.all([apiClient.get("/offices"), apiClient.get("/shifts")])
      .then(([o, s]) => {
        setOffices(o.data.data);
        setShifts(s.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    await apiClient
      .patch(`/employees/${employeeId}/assignments`, {
        primaryOfficeId: form.primaryOfficeId || null,
        defaultShiftId: form.defaultShiftId || null,
      })
      .then(onSuccess)
      .catch(() => alert("Failed to update assignments"))
      .finally(() => setSaving(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-surface-variant p-4">
          <h2 className="text-lg font-bold">Edit assignments</h2>
          <button onClick={onClose}>
            <X className="size-5 text-outline" />
          </button>
        </div>
        <div className="p-4">
          <div className="grid gap-4">
            {loading ? (
              <LoadingState />
            ) : (
              <>
                <Field label="Primary office">
                  <select
                    className={inputClass}
                    value={form.primaryOfficeId}
                    onChange={(e) =>
                      setForm({ ...form, primaryOfficeId: e.target.value })
                    }
                  >
                    <option value="">None</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.officeName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Default shift">
                  <select
                    className={inputClass}
                    value={form.defaultShiftId}
                    onChange={(e) =>
                      setForm({ ...form, defaultShiftId: e.target.value })
                    }
                  >
                    <option value="">None</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <PrimaryButton disabled={saving} onClick={save}>Save assignments</PrimaryButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
