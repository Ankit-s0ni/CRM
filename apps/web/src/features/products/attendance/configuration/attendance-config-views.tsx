"use client";

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crosshair,
  Globe2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import timezoneLookup from "tz-lookup";
import { FeatureInfo } from "@/features/platform/help/feature-info";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  FieldMap,
  type MapCoordinate,
} from "@/features/products/attendance/field/field-map";
import { TimezoneSelect } from "@/shared/components/timezone-select";
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

type Office = {
  id: string;
  officeName: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  timezone?: string;
  countryCode?: string;
  subdivisionCode?: string;
  egressIps: string[];
  wifiSsids: string[];
  _count?: { assignments: number; holidays: number };
};
type PolicyAssignment = {
  id?: string;
  scope: "TENANT_DEFAULT" | "DEPARTMENT" | "EMPLOYEE";
  deptId?: string | null;
  employeeId?: string | null;
};
type LocationMode = "NONE" | "OFFICE_GEOFENCE" | "FIELD_GPS";
type SelfieMode = "DISABLED" | "REQUIRED";
type Policy = {
  id: string;
  name: string;
  lateAfterMinutes: number;
  halfDayAfterMinutes: number;
  minimumWorkMinutes: number;
  overtimeAfterMinutes: number;
  requireFaceMatch: boolean;
  requireRegisteredDevice: boolean;
  requireGeofence: boolean;
  locationMode: LocationMode;
  selfieMode: SelfieMode;
  fieldTrackingEnabled: boolean;
  allowHybridFieldTracking: boolean;
  maxOfflineSyncHours: number;
  maxFaceAttempts: number;
  assignments: PolicyAssignment[];
};
type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
};
type Roster = {
  id: string;
  rosterDate: string;
  employee: { fullName: string; employeeCode: string };
  shift: Shift;
};
type Employee = {
  id: string;
  fullName: string;
  employeeCode: string;
  deptId?: string;
  defaultShift?: Shift | null;
};
type TenantScheduleSettings = {
  weeklyOffs: unknown;
  workingDayStart: string;
  workingDayEnd: string;
};
type ResolvedPolicy = {
  employeeId: string;
  policy: { weeklyOffs?: unknown };
};
type Department = { id: string; name: string };
type Holiday = {
  id: string;
  holidayName: string;
  holidayDate: string;
  officeLocationId?: string;
  office?: Office;
  source: "MANUAL" | "PUBLIC_DATA";
  sourceProvider?: string;
};
type HolidaySyncResult = {
  officeId: string;
  officeName: string;
  countryCode: string | null;
  imported: number;
  skipped: number;
  provider: string | null;
  status: "SYNCED" | "REGION_REQUIRED" | "PROVIDER_UNAVAILABLE";
  message?: string;
};

type OfficeRegion = {
  countryCode: string;
  subdivisionCode?: string;
};

export function OfficesView() {
  const [data, setData] = useState<Office[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Office | null>(null);
  const [assigning, setAssigning] = useState<Office | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [primaryIds, setPrimaryIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    officeName: "",
    latitude: "",
    longitude: "",
    radiusMeters: "150",
    timezone: "",
    countryCode: "",
    subdivisionCode: "",
    egressIps: "",
    wifiSsids: "",
  });
  const load = () =>
    Promise.all([
      apiClient.get("/offices"),
      apiClient.get("/employees?limit=100"),
    ])
      .then(([offices, employeeResult]) => {
        setData(offices.data.data);
        setEmployees(employeeResult.data.data);
      })
      .catch(() => setError("Office locations could not be loaded."));
  useEffect(() => {
    void load();
  }, []);
  async function saveOffice() {
    setError("");
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radiusMeters = Number(form.radiusMeters);
    if (
      !form.officeName.trim() ||
      !form.latitude.trim() ||
      !form.longitude.trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      !form.timezone ||
      !Number.isInteger(radiusMeters) ||
      radiusMeters < 25 ||
      radiusMeters > 10_000
    ) {
      setError(
        "Choose the office on the map, confirm its timezone, and enter a geofence radius between 25 and 10,000 meters.",
      );
      return;
    }
    const payload = {
      officeName: form.officeName.trim(),
      latitude,
      longitude,
      radiusMeters,
      timezone: form.timezone,
      ...(form.countryCode
        ? { countryCode: form.countryCode.toUpperCase() }
        : {}),
      ...(form.subdivisionCode
        ? { subdivisionCode: form.subdivisionCode.toUpperCase() }
        : {}),
      egressIps: form.egressIps.split(",").map(trim).filter(Boolean),
      wifiSsids: form.wifiSsids.split(",").map(trim).filter(Boolean),
    };
    await (
      editing
        ? apiClient.patch(`/offices/${editing.id}`, payload)
        : apiClient.post("/offices", payload)
    )
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() =>
        setError(
          "Office could not be saved. Check the geofence, network values, and references.",
        ),
      );
  }
  function openCreate() {
    setError("");
    setEditing(null);
    setForm({
      officeName: "",
      latitude: "",
      longitude: "",
      radiusMeters: "150",
      timezone: "",
      countryCode: "",
      subdivisionCode: "",
      egressIps: "",
      wifiSsids: "",
    });
    setOpen(true);
  }
  function openEdit(office: Office) {
    setError("");
    setEditing(office);
    setForm({
      officeName: office.officeName,
      latitude: String(office.latitude),
      longitude: String(office.longitude),
      radiusMeters: String(office.radiusMeters),
      timezone:
        timezoneForCoordinate(office.latitude, office.longitude) ??
        office.timezone ??
        "",
      countryCode: office.countryCode ?? "",
      subdivisionCode: office.subdivisionCode ?? "",
      egressIps: office.egressIps.join(", "),
      wifiSsids: office.wifiSsids.join(", "),
    });
    if (!office.countryCode) {
      const coordinate = validCoordinate(office.latitude, office.longitude);
      if (coordinate) {
        void reverseGeocodeRegion(coordinate).then((region) => {
          if (!region) return;
          setForm((current) => ({
            ...current,
            countryCode: region.countryCode,
            subdivisionCode: region.subdivisionCode ?? "",
          }));
        });
      }
    }
    setOpen(true);
  }
  function updateOfficeCoordinate(
    latitude: number,
    longitude: number,
    region?: OfficeRegion,
  ) {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      timezone: timezoneForCoordinate(latitude, longitude) ?? current.timezone,
      countryCode: region?.countryCode ?? current.countryCode,
      subdivisionCode: region?.subdivisionCode ?? current.subdivisionCode,
    }));
  }
  function detectTimezoneFromInputs() {
    const timezone = timezoneForCoordinate(form.latitude, form.longitude);
    if (timezone) setForm((current) => ({ ...current, timezone }));
  }
  async function removeOffice() {
    if (!editing || !window.confirm(`Delete ${editing.officeName}?`)) return;
    await apiClient
      .delete(`/offices/${editing.id}`)
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() =>
        setError(
          "Office cannot be deleted while assignments, holidays, or attendance evidence reference it.",
        ),
      );
  }
  async function openAssignments(office: Office) {
    setError("");
    try {
      const result = await apiClient.get(`/offices/${office.id}/employees`);
      const rows = result.data.data as Array<{
        employeeId: string;
        isPrimary: boolean;
      }>;
      setAssignedIds(rows.map((row) => row.employeeId));
      setPrimaryIds(
        rows.filter((row) => row.isPrimary).map((row) => row.employeeId),
      );
      setAssigning(office);
    } catch {
      setError("Office assignments could not be loaded.");
    }
  }
  async function saveAssignments() {
    if (!assigning) return;
    try {
      await apiClient.put(`/offices/${assigning.id}/employees`, {
        employeeIds: assignedIds,
        primaryEmployeeIds: primaryIds.filter((id) => assignedIds.includes(id)),
      });
      setAssigning(null);
      await load();
    } catch {
      setError("Office assignments could not be saved.");
    }
  }
  return (
    <AdminPage
      title="Office Locations & Geofences"
      description="Control where employees may securely record attendance."
      action={
        <PrimaryButton onClick={openCreate}>
          <Plus className="size-4" />
          Add office
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      <Panel className="mb-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-bold">How policy assignment works</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              DeltCRM resolves one effective policy for each employee. A direct
              employee assignment wins over a department assignment, and a
              department assignment wins over the tenant default.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-primary">
            <span className="rounded-full bg-zinc-100 px-3 py-2">Employee</span>
            <span>overrides</span>
            <span className="rounded-full bg-zinc-100 px-3 py-2">
              Department
            </span>
            <span>overrides</span>
            <span className="rounded-full bg-zinc-100 px-3 py-2">Tenant</span>
          </div>
        </div>
      </Panel>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p>
          <strong>Important:</strong> Saving an office does not enforce its
          geofence by itself. Assign employees to the office and give them an
          attendance policy whose location rule is{" "}
          <strong>Office geofence</strong>.
        </p>
        <a className="font-bold text-primary" href="/app/attendance/policies">
          Review attendance policies
        </a>
      </div>
      {!data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Panel className="overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_90px_130px] border-b border-surface-variant bg-zinc-50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-outline">
              <span>Office</span>
              <span>Employees</span>
              <span>Radius</span>
              <span>Action</span>
            </div>
            {data.length ? (
              data.map((office) => (
                <div
                  key={office.id}
                  className="grid grid-cols-[1fr_100px_90px_130px] items-center border-b border-surface-variant px-6 py-5 last:border-0"
                >
                  <div>
                    <div className="font-semibold">{office.officeName}</div>
                    <div className="mt-1 text-xs text-outline">
                      {office.countryCode
                        ? `${office.countryCode}${office.subdivisionCode ? ` · ${office.subdivisionCode}` : ""}`
                        : "Holiday region not set"}{" "}
                      · {office.timezone || "Tenant timezone"} ·{" "}
                      {(office.egressIps as string[]).length} trusted networks
                    </div>
                    <div className="mt-1 text-xs text-outline">
                      {Number(office.latitude).toFixed(6)},{" "}
                      {Number(office.longitude).toFixed(6)}
                    </div>
                  </div>
                  <span className="text-sm">
                    {office._count?.assignments ?? 0}
                  </span>
                  <span className="text-sm">{office.radiusMeters} m</span>
                  <div className="flex gap-3">
                    <button
                      className="text-left text-xs font-semibold text-primary"
                      onClick={() => openAssignments(office)}
                    >
                      Assign
                    </button>
                    <button
                      className="text-left text-xs font-semibold text-primary"
                      onClick={() => openEdit(office)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No offices yet"
                body="Add an office to configure its circular geofence and network allow-list."
              />
            )}
          </Panel>
          <OfficeMap offices={data} />
        </div>
      )}
      {open && (
        <Dialog
          error={error}
          wide
          title={editing ? "Edit office" : "Add office"}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        >
          <div className="grid gap-4">
            <OfficeLocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              radiusMeters={form.radiusMeters}
              onChange={({ latitude, longitude }, region) =>
                updateOfficeCoordinate(latitude, longitude, region)
              }
            />
            <Field label="Office name">
              <input
                autoFocus
                className={inputClass}
                value={form.officeName}
                onChange={(e) =>
                  setForm({ ...form, officeName: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude">
                <input
                  className={inputClass}
                  value={form.latitude}
                  onBlur={detectTimezoneFromInputs}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                />
              </Field>
              <Field label="Longitude">
                <input
                  className={inputClass}
                  value={form.longitude}
                  onBlur={detectTimezoneFromInputs}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Radius in meters" helpKey="location-verification">
              <input
                type="number"
                className={inputClass}
                value={form.radiusMeters}
                onChange={(e) =>
                  setForm({ ...form, radiusMeters: e.target.value })
                }
              />
            </Field>
            <Field label="Timezone">
              <TimezoneSelect
                value={form.timezone}
                onChange={(timezone) => setForm({ ...form, timezone })}
                description="Detected from the office pin. You can override it if the location is near a timezone boundary."
                showDetect={false}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Holiday country">
                <input
                  className={inputClass}
                  maxLength={2}
                  placeholder="IN"
                  value={form.countryCode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      countryCode: event.target.value
                        .replace(/[^a-z]/gi, "")
                        .slice(0, 2)
                        .toUpperCase(),
                    })
                  }
                />
                <p className="mt-1 text-xs text-outline">
                  ISO country code detected from the office pin.
                </p>
              </Field>
              <Field label="State or region">
                <input
                  className={inputClass}
                  maxLength={16}
                  placeholder="IN-KA"
                  value={form.subdivisionCode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      subdivisionCode: event.target.value.toUpperCase(),
                    })
                  }
                />
                <p className="mt-1 text-xs text-outline">
                  Optional ISO 3166-2 subdivision code.
                </p>
              </Field>
            </div>
            <Field label="Egress IPs or CIDRs">
              <input
                className={inputClass}
                placeholder="203.0.113.10, 10.0.0.0/24"
                value={form.egressIps}
                onChange={(e) =>
                  setForm({ ...form, egressIps: e.target.value })
                }
              />
            </Field>
            <Field label="Advisory Wi-Fi SSIDs">
              <input
                className={inputClass}
                value={form.wifiSsids}
                onChange={(e) =>
                  setForm({ ...form, wifiSsids: e.target.value })
                }
              />
            </Field>
            <div className="flex gap-3">
              {editing && (
                <button
                  className="h-11 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                  onClick={removeOffice}
                >
                  Delete
                </button>
              )}
              <PrimaryButton className="flex-1" onClick={saveOffice}>
                Save office
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
      {assigning && (
        <Dialog
          error={error}
          title={`Assign employees · ${assigning.officeName}`}
          onClose={() => setAssigning(null)}
        >
          <div className="grid max-h-96 gap-2 overflow-auto">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-[1fr_auto] items-center rounded-lg bg-zinc-50 p-3"
              >
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={assignedIds.includes(employee.id)}
                    onChange={(event) => {
                      setAssignedIds((current) =>
                        event.target.checked
                          ? [...current, employee.id]
                          : current.filter((id) => id !== employee.id),
                      );
                      if (!event.target.checked)
                        setPrimaryIds((current) =>
                          current.filter((id) => id !== employee.id),
                        );
                    }}
                  />
                  <span>
                    <strong>{employee.fullName}</strong>
                    <span className="block text-xs text-outline">
                      {employee.employeeCode}
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    disabled={!assignedIds.includes(employee.id)}
                    checked={primaryIds.includes(employee.id)}
                    onChange={(event) =>
                      setPrimaryIds((current) =>
                        event.target.checked
                          ? [...current, employee.id]
                          : current.filter((id) => id !== employee.id),
                      )
                    }
                  />
                  Primary
                </label>
              </div>
            ))}
          </div>
          <PrimaryButton className="mt-5 w-full" onClick={saveAssignments}>
            Save assignments
          </PrimaryButton>
        </Dialog>
      )}
    </AdminPage>
  );
}

export function PoliciesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusedEmployeeId = searchParams.get("employeeId");
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/app/employees/")
    ? requestedReturnTo
    : focusedEmployeeId
      ? `/app/employees/${focusedEmployeeId}?tab=assignments`
      : "/app/employees";
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const [data, setData] = useState<Policy[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [capabilities, setCapabilities] = useState<{
    biometricEnforcementAvailable: boolean;
    fieldTrackingEntitled: boolean;
    fieldTrackingEnabled: boolean;
    fieldTrackingIntervalMin: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [focusedEmployee, setFocusedEmployee] = useState<Employee | null>(null);
  const [focusedPolicyId, setFocusedPolicyId] = useState("");
  const [focusedResolution, setFocusedResolution] = useState<{
    policyName: string;
    source: string;
  } | null>(null);
  const [focusedError, setFocusedError] = useState("");
  const [focusedSaving, setFocusedSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Policy | null>(null);
  const [ruleEditing, setRuleEditing] = useState<Policy | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    lateAfterMinutes: 15,
    halfDayAfterMinutes: 240,
    minimumWorkMinutes: 480,
    overtimeAfterMinutes: 540,
    maxOfflineSyncHours: 48,
    maxFaceAttempts: 3,
    locationMode: "OFFICE_GEOFENCE" as LocationMode,
    selfieMode: "DISABLED" as SelfieMode,
    requireRegisteredDevice: true,
    fieldTrackingEnabled: false,
    allowHybridFieldTracking: false,
  });
  const [assignments, setAssignments] = useState<PolicyAssignment[]>([]);
  const [assignmentForm, setAssignmentForm] = useState<{
    scope: PolicyAssignment["scope"];
    targetId: string;
  }>({ scope: "TENANT_DEFAULT", targetId: "" });
  const load = () =>
    Promise.all([
      apiClient.get("/attendance-policies"),
      apiClient.get("/departments"),
      apiClient.get("/employees?limit=100"),
      permissions.includes("attendance.config.read") ||
      permissions.includes("attendance.config.manage")
        ? apiClient.get("/workspace/attendance-capabilities").catch(() => null)
        : Promise.resolve(null),
      focusedEmployeeId
        ? apiClient.get(`/employees/${focusedEmployeeId}`)
        : Promise.resolve(null),
      focusedEmployeeId
        ? apiClient
            .get(
              `/attendance-policies/resolve?employeeId=${focusedEmployeeId}&date=${new Date().toISOString().slice(0, 10)}`,
            )
            .catch(() => null)
        : Promise.resolve(null),
    ])
      .then(
        ([
          policies,
          departmentResult,
          employeeResult,
          capabilityResult,
          focusedEmployeeResult,
          resolutionResult,
        ]) => {
          const policyRows = policies.data.data as Policy[];
          setData(policyRows);
          setDepartments(departmentResult.data.data);
          setEmployees(employeeResult.data.data);
          if (capabilityResult) setCapabilities(capabilityResult.data.data);
          if (focusedEmployeeResult) {
            setFocusedEmployee(focusedEmployeeResult.data.data);
            const directPolicy = policyRows.find((policy) =>
              policy.assignments.some(
                (assignment) =>
                  assignment.scope === "EMPLOYEE" &&
                  assignment.employeeId === focusedEmployeeId,
              ),
            );
            setFocusedPolicyId(directPolicy?.id ?? "");
          }
          if (resolutionResult) {
            setFocusedResolution({
              policyName: resolutionResult.data.data.name,
              source: resolutionResult.data.resolution.source,
            });
          }
        },
      )
      .catch(() => setError("Policies could not be loaded."));
  const loadPolicies = useEffectEvent(load);
  useEffect(() => {
    void loadPolicies();
  }, [focusedEmployeeId]);
  async function create() {
    await apiClient
      .post("/attendance-policies", { name })
      .then(() => {
        setOpen(false);
        setName("");
        load();
      })
      .catch(() => setError("Policy could not be created."));
  }
  function addAssignment() {
    const next: PolicyAssignment =
      assignmentForm.scope === "TENANT_DEFAULT"
        ? { scope: "TENANT_DEFAULT" }
        : assignmentForm.scope === "DEPARTMENT"
          ? { scope: "DEPARTMENT", deptId: assignmentForm.targetId }
          : { scope: "EMPLOYEE", employeeId: assignmentForm.targetId };
    const key = assignmentKey(next);
    if (!assignmentForm.targetId && assignmentForm.scope !== "TENANT_DEFAULT")
      return;
    if (!assignments.some((item) => assignmentKey(item) === key))
      setAssignments((current) => [...current, next]);
  }
  async function saveAssignments() {
    if (!editing) return;
    try {
      await apiClient.put(`/attendance-policies/${editing.id}/assignments`, {
        assignments: assignments.map(({ scope, deptId, employeeId }) => ({
          scope,
          ...(deptId ? { deptId } : {}),
          ...(employeeId ? { employeeId } : {}),
        })),
      });
      setEditing(null);
      await load();
    } catch (caught) {
      setError(
        requestErrorMessage(
          caught,
          "Policy assignments conflict with an existing scope or target.",
        ),
      );
    }
  }
  async function saveFocusedEmployeePolicy() {
    if (!focusedEmployeeId) return;
    setFocusedSaving(true);
    setFocusedError("");
    try {
      await apiClient.put(
        `/attendance-policies/employees/${focusedEmployeeId}`,
        { policyId: focusedPolicyId || null },
      );
      router.push(returnTo);
    } catch (caught) {
      setFocusedError(
        requestErrorMessage(
          caught,
          "This employee policy could not be updated.",
        ),
      );
    } finally {
      setFocusedSaving(false);
    }
  }
  function openRuleEditor(policy: Policy) {
    setRuleEditing(policy);
    setRuleForm({
      name: policy.name,
      lateAfterMinutes: policy.lateAfterMinutes,
      halfDayAfterMinutes: policy.halfDayAfterMinutes,
      minimumWorkMinutes: policy.minimumWorkMinutes,
      overtimeAfterMinutes: policy.overtimeAfterMinutes,
      maxOfflineSyncHours: policy.maxOfflineSyncHours,
      maxFaceAttempts: policy.maxFaceAttempts,
      locationMode: policy.locationMode,
      selfieMode: policy.selfieMode,
      requireRegisteredDevice: policy.requireRegisteredDevice,
      fieldTrackingEnabled: policy.fieldTrackingEnabled,
      allowHybridFieldTracking: policy.allowHybridFieldTracking,
    });
  }
  async function saveRules() {
    if (!ruleEditing) return;
    setError("");
    try {
      if (
        ruleForm.fieldTrackingEnabled &&
        capabilities?.fieldTrackingEnabled === false
      ) {
        const capabilityResponse = await apiClient.patch(
          "/workspace/attendance-capabilities",
          {
            fieldTrackingEnabled: true,
            fieldTrackingIntervalMin:
              capabilities.fieldTrackingIntervalMin || 15,
          },
        );
        setCapabilities(capabilityResponse.data.data);
      }
      await apiClient.patch(`/attendance-policies/${ruleEditing.id}`, ruleForm);
      setRuleEditing(null);
      await load();
    } catch (requestError: unknown) {
      const response = requestError as {
        response?: { data?: { message?: string } };
      };
      setError(
        response.response?.data?.message ??
          "Policy rules could not be saved. Review the thresholds and tenant capabilities.",
      );
    }
  }
  async function removePolicy() {
    if (!ruleEditing || !window.confirm(`Delete ${ruleEditing.name}?`)) return;
    await apiClient
      .delete(`/attendance-policies/${ruleEditing.id}`)
      .then(() => {
        setRuleEditing(null);
        load();
      })
      .catch(() => setError("Assigned policies cannot be deleted."));
  }
  return (
    <AdminPage
      title="Attendance Policies"
      description="Define verification and work-time rules, then assign by employee, department or tenant default."
      action={
        <PrimaryButton onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Create policy
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {data.map((policy) => (
            <Panel key={policy.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-zinc-100 text-primary">
                  <ShieldCheck />
                </div>
                <span className="rounded-full bg-emerald-300/35 px-3 py-1 text-xs font-semibold text-emerald-900">
                  {policyCoverage(policy.assignments, employees)} employees
                </span>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{policy.name}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Metric
                  label="Late after"
                  value={`${policy.lateAfterMinutes} min`}
                />
                <Metric
                  label="Half day"
                  value={`${policy.halfDayAfterMinutes} min`}
                />
                <Metric
                  label="Minimum work"
                  value={`${policy.minimumWorkMinutes} min`}
                />
                <Metric
                  label="Overtime"
                  value={`${policy.overtimeAfterMinutes} min`}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
                {policy.locationMode !== "NONE" && (
                  <Tag>
                    {policy.locationMode === "OFFICE_GEOFENCE"
                      ? "Office geofence"
                      : "Field GPS"}
                  </Tag>
                )}
                {policy.requireRegisteredDevice && <Tag>Registered device</Tag>}
                {policy.selfieMode === "REQUIRED" && <Tag>Selfie</Tag>}
                {policy.fieldTrackingEnabled && <Tag>Field tracking</Tag>}
              </div>
              <div className="mt-5 flex gap-4">
                <button
                  className="text-sm font-semibold text-primary"
                  onClick={() => openRuleEditor(policy)}
                >
                  Edit rules
                </button>
                <button
                  className="text-sm font-semibold text-primary"
                  onClick={() => {
                    setEditing(policy);
                    setAssignments(policy.assignments);
                  }}
                >
                  Manage assignments
                </button>
              </div>
            </Panel>
          ))}
          {!data.length && (
            <Panel className="lg:col-span-2 xl:col-span-3">
              <EmptyState
                title="No policies"
                body="Create a policy and assign one tenant default before attendance begins."
              />
            </Panel>
          )}
        </div>
      )}
      {open && (
        <Dialog
          error={error}
          title="Create attendance policy"
          onClose={() => setOpen(false)}
        >
          <Field label="Policy name">
            <input
              autoFocus
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm text-on-surface-variant">
            New policies start with secure default thresholds and can be refined
            after creation.
          </div>
          <PrimaryButton className="mt-5 w-full" onClick={create}>
            Create policy
          </PrimaryButton>
        </Dialog>
      )}
      {editing && (
        <Dialog
          error={error}
          title={`Assignments · ${editing.name}`}
          onClose={() => setEditing(null)}
        >
          <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-on-surface-variant">
            Assign the broad tenant default first, use department assignments
            for team-specific rules, and use employee assignments only for
            approved exceptions. This policy currently resolves directly for
            approximately {policyCoverage(assignments, employees)} employees; a
            higher-priority assignment on another policy may override it.
          </div>
          <div className="grid gap-3">
            {assignments.map((assignment) => (
              <div
                key={assignmentKey(assignment)}
                className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 text-sm"
              >
                <span>
                  {assignmentLabel(assignment, departments, employees)}
                </span>
                <button
                  className="text-xs font-semibold text-error"
                  onClick={() =>
                    setAssignments((current) =>
                      current.filter(
                        (item) =>
                          assignmentKey(item) !== assignmentKey(assignment),
                      ),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 rounded-xl border border-surface-variant p-4">
            <Field label="Scope" helpKey="policies">
              <select
                className={inputClass}
                value={assignmentForm.scope}
                onChange={(event) =>
                  setAssignmentForm({
                    scope: event.target.value as PolicyAssignment["scope"],
                    targetId: "",
                  })
                }
              >
                <option value="TENANT_DEFAULT">Tenant default</option>
                <option value="DEPARTMENT">Department</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </Field>
            {assignmentForm.scope === "DEPARTMENT" && (
              <Field label="Department">
                <select
                  className={inputClass}
                  value={assignmentForm.targetId}
                  onChange={(event) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      targetId: event.target.value,
                    })
                  }
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {assignmentForm.scope === "EMPLOYEE" && (
              <Field label="Employee">
                <select
                  className={inputClass}
                  value={assignmentForm.targetId}
                  onChange={(event) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      targetId: event.target.value,
                    })
                  }
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <button
              className="h-10 rounded-lg border border-primary text-sm font-semibold text-primary"
              onClick={addAssignment}
            >
              Add assignment
            </button>
          </div>
          <PrimaryButton className="mt-5 w-full" onClick={saveAssignments}>
            Save assignments
          </PrimaryButton>
        </Dialog>
      )}
      {focusedEmployeeId && focusedEmployee && data && (
        <Dialog
          title={`Attendance policy · ${focusedEmployee.fullName}`}
          onClose={() => router.push(returnTo)}
        >
          {focusedError && <ErrorState message={focusedError} />}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-on-surface-variant">
            Choose one predefined policy for this employee. An employee policy
            overrides department and tenant defaults. Choose inherited policy to
            remove the employee-specific exception.
          </div>
          {focusedResolution && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 p-4 text-sm">
              <span className="text-zinc-500">Currently effective</span>
              <strong>
                {focusedResolution.policyName} ·{" "}
                {sentenceCase(focusedResolution.source)}
              </strong>
            </div>
          )}
          <fieldset className="mt-5 grid gap-3">
            <legend className="mb-1 text-sm font-bold">
              Policy for {focusedEmployee.fullName}
            </legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-variant p-4">
              <input
                checked={!focusedPolicyId}
                className="mt-1 accent-primary"
                name="employee-policy"
                onChange={() => setFocusedPolicyId("")}
                type="radio"
              />
              <span>
                <strong className="block text-sm">Use inherited policy</strong>
                <span className="mt-1 block text-xs leading-5 text-outline">
                  Use the employee&apos;s department policy, then tenant
                  default.
                </span>
              </span>
            </label>
            {data.map((policy) => (
              <label
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-variant p-4"
                key={policy.id}
              >
                <input
                  checked={focusedPolicyId === policy.id}
                  className="mt-1 accent-primary"
                  name="employee-policy"
                  onChange={() => setFocusedPolicyId(policy.id)}
                  type="radio"
                />
                <span>
                  <strong className="block text-sm">{policy.name}</strong>
                  <span className="mt-1 block text-xs leading-5 text-outline">
                    {policy.locationMode.replaceAll("_", " ")} · Selfie{" "}
                    {policy.selfieMode.toLowerCase()} · Device{" "}
                    {policy.requireRegisteredDevice ? "required" : "optional"}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <PrimaryButton
            className="mt-5 w-full"
            disabled={focusedSaving}
            onClick={saveFocusedEmployeePolicy}
          >
            {focusedSaving ? "Saving policy…" : "Save employee policy"}
          </PrimaryButton>
        </Dialog>
      )}
      {ruleEditing && (
        <Dialog
          error={error}
          title="Edit policy rules"
          onClose={() => setRuleEditing(null)}
        >
          <div className="grid gap-4">
            <Field label="Policy name">
              <input
                className={inputClass}
                value={ruleForm.name}
                onChange={(event) =>
                  setRuleForm({ ...ruleForm, name: event.target.value })
                }
              />
            </Field>
            <div className="rounded-xl border border-surface-variant p-4">
              <h3 className="font-bold">Attendance calculation</h3>
              <p className="mt-1 text-xs leading-5 text-outline">
                Set when a workday becomes late, half-day, complete, or
                overtime.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(
                  [
                    ["lateAfterMinutes", "Late after (minutes)"],
                    ["halfDayAfterMinutes", "Half-day after (minutes)"],
                    ["minimumWorkMinutes", "Minimum work (minutes)"],
                    ["overtimeAfterMinutes", "Overtime after (minutes)"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      min="0"
                      type="number"
                      value={ruleForm[key]}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          [key]: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-surface-variant p-4">
              <h3 className="font-bold">Punch verification</h3>
              <p className="mt-1 text-xs leading-5 text-outline">
                Choose what the employee must verify during check-in and
                check-out.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field
                  helpKey="location-verification"
                  label="Location verification"
                >
                  <select
                    className={inputClass}
                    value={ruleForm.locationMode}
                    onChange={(event) =>
                      setRuleForm({
                        ...ruleForm,
                        locationMode: event.target.value as LocationMode,
                      })
                    }
                  >
                    <option value="NONE">No location required</option>
                    <option value="OFFICE_GEOFENCE">Office geofence</option>
                    <option value="FIELD_GPS">Current GPS location</option>
                  </select>
                </Field>
                {capabilities?.biometricEnforcementAvailable !== false && (
                  <Field
                    helpKey="selfie-verification"
                    label="Selfie verification"
                  >
                    <select
                      className={inputClass}
                      value={ruleForm.selfieMode}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          selfieMode: event.target.value as SelfieMode,
                        })
                      }
                    >
                      <option value="DISABLED">Not required</option>
                      <option value="REQUIRED">Required</option>
                    </select>
                  </Field>
                )}
                {capabilities?.biometricEnforcementAvailable !== false &&
                  ruleForm.selfieMode === "REQUIRED" && (
                    <Field
                      helpKey="selfie-verification"
                      label="Maximum face attempts"
                    >
                      <input
                        className={inputClass}
                        max="10"
                        min="1"
                        type="number"
                        value={ruleForm.maxFaceAttempts}
                        onChange={(event) =>
                          setRuleForm({
                            ...ruleForm,
                            maxFaceAttempts: Number(event.target.value),
                          })
                        }
                      />
                    </Field>
                  )}
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
                <label className="flex min-h-10 flex-1 items-center gap-3">
                  <input
                    checked={ruleForm.requireRegisteredDevice}
                    type="checkbox"
                    onChange={(event) =>
                      setRuleForm({
                        ...ruleForm,
                        requireRegisteredDevice: event.target.checked,
                      })
                    }
                  />
                  Require an HR-approved registered device
                </label>
                <FeatureInfo className="ml-auto" helpKey="devices" />
              </div>
            </div>
            <div className="rounded-xl border border-surface-variant p-4">
              <h3 className="font-bold">Offline attendance</h3>
              <p className="mt-1 text-xs leading-5 text-outline">
                Allow a stored punch to sync when the employee regains
                connectivity.
              </p>
              <div className="mt-4 max-w-xs">
                <Field label="Maximum offline sync delay (hours)">
                  <input
                    className={inputClass}
                    max="168"
                    min="0"
                    type="number"
                    value={ruleForm.maxOfflineSyncHours}
                    onChange={(event) =>
                      setRuleForm({
                        ...ruleForm,
                        maxOfflineSyncHours: Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
            </div>
            {capabilities?.fieldTrackingEntitled !== false && (
              <div className="rounded-xl border border-surface-variant p-4">
                <h3 className="font-bold">Field workforce tracking</h3>
                <p className="mt-1 text-xs leading-5 text-outline">
                  Optional continuous route tracking for eligible field
                  employees.
                </p>
                <div className="mt-3 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
                  <label className="flex min-h-10 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={ruleForm.fieldTrackingEnabled}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          fieldTrackingEnabled: event.target.checked,
                          allowHybridFieldTracking: event.target.checked
                            ? ruleForm.allowHybridFieldTracking
                            : false,
                        })
                      }
                    />
                    Enable field tracking for field employees
                  </label>
                  <FeatureInfo
                    className="ml-auto"
                    helpKey="background-tracking"
                  />
                </div>
                {ruleForm.fieldTrackingEnabled && (
                  <label className="mt-3 flex min-h-10 items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
                    <input
                      checked={ruleForm.allowHybridFieldTracking}
                      type="checkbox"
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          allowHybridFieldTracking: event.target.checked,
                        })
                      }
                    />
                    Also allow tracking for hybrid employees
                  </label>
                )}
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Employee app impact
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Employees using this policy will{" "}
                {ruleForm.locationMode === "NONE"
                  ? "not be asked for location"
                  : ruleForm.locationMode === "OFFICE_GEOFENCE"
                    ? "verify an office geofence"
                    : "submit field GPS"}
                ,{" "}
                {ruleForm.selfieMode === "REQUIRED"
                  ? "take a selfie"
                  : "skip the selfie step"}
                , and{" "}
                {ruleForm.fieldTrackingEnabled
                  ? "see field tracking when their work type allows it"
                  : "not see field tracking"}
                .
              </p>
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                Dependencies to verify
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">
                {ruleForm.locationMode === "OFFICE_GEOFENCE" && (
                  <li>- Every affected employee needs an assigned office.</li>
                )}
                {ruleForm.locationMode === "FIELD_GPS" && (
                  <li>
                    - Employee devices must grant precise location access.
                  </li>
                )}
                {ruleForm.selfieMode === "REQUIRED" && (
                  <li>- Employees need active consent and face enrollment.</li>
                )}
                {ruleForm.requireRegisteredDevice && (
                  <li>- HR must approve a registered employee device.</li>
                )}
                {ruleForm.fieldTrackingEnabled && (
                  <li>
                    - Field tracking entitlement and background location
                    permission must remain active.
                  </li>
                )}
                {ruleForm.locationMode === "NONE" &&
                  ruleForm.selfieMode === "DISABLED" &&
                  !ruleForm.requireRegisteredDevice && (
                    <li>
                      - This policy accepts punches without location, selfie, or
                      device trust. Confirm that this matches the security risk.
                    </li>
                  )}
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                className="h-11 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                onClick={removePolicy}
              >
                Delete
              </button>
              <PrimaryButton className="flex-1" onClick={saveRules}>
                Save rules
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
    </AdminPage>
  );
}

export function ShiftsView() {
  const [data, setData] = useState<Shift[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "18:00",
  });
  const load = () =>
    apiClient
      .get("/shifts")
      .then(({ data }) => setData(data.data))
      .catch(() => setError("Shifts could not be loaded."));
  useEffect(() => {
    void load();
  }, []);
  async function saveShift() {
    await (
      editing
        ? apiClient.patch(`/shifts/${editing.id}`, form)
        : apiClient.post("/shifts", form)
    )
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() => setError("Shift could not be saved."));
  }
  function openCreate() {
    setEditing(null);
    setForm({ name: "", startTime: "09:00", endTime: "18:00" });
    setOpen(true);
  }
  function openEdit(shift: Shift) {
    setEditing(shift);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });
    setOpen(true);
  }
  async function removeShift() {
    if (!editing || !window.confirm(`Delete ${editing.name}?`)) return;
    await apiClient
      .delete(`/shifts/${editing.id}`)
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() =>
        setError(
          "Shift is referenced by employees, rosters, or attendance records.",
        ),
      );
  }
  return (
    <AdminPage
      title="Shifts Management"
      description="Create day and overnight shifts with deterministic date attribution."
      action={
        <PrimaryButton onClick={openCreate}>
          <Plus className="size-4" />
          Add new shift
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {data.map((shift) => (
            <Panel key={shift.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-xl bg-zinc-100 text-primary">
                  <Clock3 />
                </div>
                {shift.isOvernight && (
                  <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                    Overnight
                  </span>
                )}
              </div>
              <h2 className="mt-5 text-lg font-semibold">{shift.name}</h2>
              <div className="mt-5 flex items-center gap-4">
                <strong className="text-2xl">{shift.startTime}</strong>
                <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-primary to-emerald-300" />
                <strong className="text-2xl">{shift.endTime}</strong>
              </div>
              <button
                className="mt-5 text-sm font-semibold text-primary"
                onClick={() => openEdit(shift)}
              >
                Edit shift
              </button>
            </Panel>
          ))}
        </div>
      )}
      {open && (
        <Dialog
          error={error}
          title={editing ? "Edit shift" : "Add new shift"}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        >
          <div className="grid gap-4">
            <Field label="Shift name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Starts">
                <input
                  type="time"
                  className={inputClass}
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </Field>
              <Field label="Ends">
                <input
                  type="time"
                  className={inputClass}
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="flex gap-3">
              {editing && (
                <button
                  className="h-11 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                  onClick={removeShift}
                >
                  Delete
                </button>
              )}
              <PrimaryButton className="flex-1" onClick={saveShift}>
                Save shift
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
    </AdminPage>
  );
}

export function RostersView() {
  const today = new Date();
  const end = new Date(today.getTime() + 6 * 86_400_000);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const [data, setData] = useState<Roster[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [settings, setSettings] = useState<TenantScheduleSettings | null>(null);
  const [policyByEmployee, setPolicyByEmployee] = useState<
    Record<string, ResolvedPolicy["policy"]>
  >({});
  const [error, setError] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    employeeIds: [] as string[],
    shiftId: "",
    startDate: iso(today),
    endDate: iso(end),
  });
  const [bulkResult, setBulkResult] = useState("");
  const load = () =>
    Promise.all([
      apiClient.get(`/rosters?startDate=${iso(today)}&endDate=${iso(end)}`),
      apiClient.get("/employees?limit=100"),
      apiClient.get("/shifts"),
      apiClient.get("/tenant-settings"),
    ])
      .then(async ([rosters, employeeResult, shiftResult, settingsResult]) => {
        const loadedEmployees = employeeResult.data.data as Employee[];
        setData(rosters.data.data);
        setEmployees(loadedEmployees);
        setShifts(shiftResult.data.data);
        setSettings(settingsResult.data.data);
        if (!loadedEmployees.length) {
          setPolicyByEmployee({});
          return;
        }
        try {
          const result = await apiClient.post(
            "/attendance-policies/resolve/bulk",
            {
              employeeIds: loadedEmployees.map(({ id }) => id),
              date: iso(today),
            },
          );
          setPolicyByEmployee(
            Object.fromEntries(
              (result.data.data as ResolvedPolicy[]).map((item) => [
                item.employeeId,
                item.policy,
              ]),
            ),
          );
        } catch {
          // Tenant working-week settings remain the safe inherited fallback.
          setPolicyByEmployee({});
        }
      })
      .catch(() => setError("Roster planner could not be loaded."));
  const loadRosters = useEffectEvent(load);

  useEffect(() => {
    void loadRosters();
  }, []);
  async function bulkAssign() {
    setError("");
    try {
      const result = await apiClient.post("/rosters/bulk", bulkForm);
      const summary = result.data.data as {
        inserted: number;
        unchanged: number;
        errors: unknown[];
      };
      setBulkResult(
        `${summary.inserted} assigned · ${summary.unchanged} unchanged · ${summary.errors.length} conflicts`,
      );
      await load();
    } catch {
      setError("Bulk roster assignment could not be completed.");
    }
  }
  async function removeRoster(roster: Roster) {
    if (
      !window.confirm(
        `Remove ${roster.shift.name} for ${roster.employee.fullName}?`,
      )
    )
      return;
    await apiClient
      .delete(`/rosters/${roster.id}`)
      .then(() => load())
      .catch(() => setError("Roster assignment could not be removed."));
  }
  return (
    <AdminPage
      title="Roster Planner"
      description="Plan the working week, bulk assign shifts and import validated CSV schedules."
      action={
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold">
            <Upload className="size-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) =>
                event.target.files?.[0] &&
                uploadRoster(event.target.files[0], setError, load)
              }
            />
          </label>
          <PrimaryButton
            onClick={() => {
              setBulkForm({
                employeeIds: [],
                shiftId: "",
                startDate: iso(today),
                endDate: iso(end),
              });
              setBulkResult("");
              setBulkOpen(true);
            }}
          >
            <Plus className="size-4" />
            Assign shift
          </PrimaryButton>
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-auto">
          <div className="min-w-[850px]">
            <div className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-surface-variant bg-zinc-50">
              <div className="p-4 text-xs font-bold uppercase text-outline">
                Employee
              </div>
              {dateRange(today, end).map((date) => (
                <div
                  key={date.toISOString()}
                  className="border-l border-surface-variant p-4 text-center text-xs font-bold"
                >
                  <div>
                    {date.toLocaleDateString("en", { weekday: "short" })}
                  </div>
                  <div className="text-outline">{date.getDate()}</div>
                </div>
              ))}
            </div>
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-surface-variant last:border-0"
              >
                <div className="p-4">
                  <div className="font-semibold">{employee.fullName}</div>
                  <div className="text-xs text-outline">
                    {employee.employeeCode}
                  </div>
                </div>
                {dateRange(today, end).map((date) => {
                  const roster = data.find(
                    (row) =>
                      row.employee.employeeCode === employee.employeeCode &&
                      row.rosterDate.slice(0, 10) === iso(date),
                  );
                  const weeklyOffs =
                    policyByEmployee[employee.id]?.weeklyOffs ??
                    settings?.weeklyOffs;
                  const weeklyOff =
                    !roster && isWeeklyOffDate(weeklyOffs, date);
                  const inheritedShift = employee.defaultShift;
                  const inheritedHours =
                    settings &&
                    `${settings.workingDayStart}-${settings.workingDayEnd}`;
                  return (
                    <div
                      key={date.toISOString()}
                      className="grid min-h-16 place-items-center border-l border-surface-variant p-2"
                    >
                      {roster ? (
                        <button
                          title="Remove roster"
                          className="rounded-lg bg-blue-50 px-2 py-1 text-center text-xs font-semibold text-blue-700"
                          onClick={() => removeRoster(roster)}
                        >
                          <span className="block">{roster.shift.name}</span>
                          <span className="block text-[10px] font-medium text-blue-500">
                            Roster
                          </span>
                        </button>
                      ) : (
                        <button
                          className={`flex h-full w-full items-center justify-center rounded-lg px-1 text-center hover:bg-zinc-100/50 ${
                            weeklyOff ? "bg-slate-50" : "bg-emerald-50/50"
                          }`}
                          onClick={() => {
                            setBulkForm({
                              employeeIds: [employee.id],
                              shiftId: "",
                              startDate: iso(date),
                              endDate: iso(date),
                            });
                            setBulkResult("");
                            setBulkOpen(true);
                          }}
                        >
                          {weeklyOff ? (
                            <span className="text-xs font-semibold text-slate-500">
                              Weekly off
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700">
                              <span className="block">
                                {inheritedShift?.name ??
                                  inheritedHours ??
                                  "Working day"}
                              </span>
                              <span className="block text-[10px] font-medium text-emerald-500">
                                Inherited
                              </span>
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {!employees.length && (
              <EmptyState
                title="No employees"
                body="Create employees before assigning weekly rosters."
              />
            )}
          </div>
        </Panel>
      )}
      {bulkOpen && (
        <Dialog
          error={error}
          title="Assign shift(s)"
          onClose={() => setBulkOpen(false)}
        >
          <div className="grid gap-4">
            <Field label="Shift">
              <select
                className={inputClass}
                value={bulkForm.shiftId}
                onChange={(event) =>
                  setBulkForm({ ...bulkForm, shiftId: event.target.value })
                }
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input
                  type="date"
                  className={inputClass}
                  value={bulkForm.startDate}
                  onChange={(event) =>
                    setBulkForm({ ...bulkForm, startDate: event.target.value })
                  }
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  className={inputClass}
                  value={bulkForm.endDate}
                  onChange={(event) =>
                    setBulkForm({ ...bulkForm, endDate: event.target.value })
                  }
                />
              </Field>
            </div>
            <fieldset className="grid max-h-64 gap-2 overflow-auto">
              <legend className="mb-2 text-sm font-medium">Employees</legend>
              {employees.map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={bulkForm.employeeIds.includes(employee.id)}
                    onChange={(event) =>
                      setBulkForm((current) => ({
                        ...current,
                        employeeIds: event.target.checked
                          ? [...current.employeeIds, employee.id]
                          : current.employeeIds.filter(
                              (id) => id !== employee.id,
                            ),
                      }))
                    }
                  />
                  {employee.fullName}
                </label>
              ))}
            </fieldset>
            {bulkResult && (
              <div className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-900">
                {bulkResult}
              </div>
            )}
            <PrimaryButton
              disabled={!bulkForm.shiftId || !bulkForm.employeeIds.length}
              onClick={bulkAssign}
            >
              Apply shift
            </PrimaryButton>
          </div>
        </Dialog>
      )}
    </AdminPage>
  );
}

export function HolidaysView() {
  const [data, setData] = useState<Holiday[] | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(
    () =>
      new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      ),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState({
    holidayName: "",
    holidayDate: "",
    officeLocationId: "",
  });
  const load = () =>
    Promise.all([apiClient.get("/holidays"), apiClient.get("/offices")])
      .then(([holidays, officeResult]) => {
        setData(holidays.data.data);
        setOffices(officeResult.data.data);
        setError("");
      })
      .catch(() => setError("Holiday calendar could not be loaded."));
  useEffect(() => {
    void load();
  }, []);
  async function saveHoliday() {
    const payload = {
      holidayName: form.holidayName,
      holidayDate: form.holidayDate,
      ...(form.officeLocationId
        ? { officeLocationId: form.officeLocationId }
        : {}),
    };
    await (
      editing
        ? apiClient.patch(`/holidays/${editing.id}`, payload)
        : apiClient.post("/holidays", payload)
    )
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() => setError("Holiday already exists for this date and scope."));
  }
  function openCreate() {
    setEditing(null);
    setForm({ holidayName: "", holidayDate: "", officeLocationId: "" });
    setOpen(true);
  }
  function openEdit(holiday: Holiday) {
    setEditing(holiday);
    setForm({
      holidayName: holiday.holidayName,
      holidayDate: holiday.holidayDate.slice(0, 10),
      officeLocationId: holiday.officeLocationId ?? "",
    });
    setOpen(true);
  }
  async function removeHoliday() {
    if (!editing || !window.confirm(`Delete ${editing.holidayName}?`)) return;
    await apiClient
      .delete(`/holidays/${editing.id}`)
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() => setError("Holiday could not be deleted."));
  }
  async function syncPublicHolidays() {
    setSyncing(true);
    setError("");
    setSyncMessage("");
    try {
      const { data: response } = await apiClient.post<{
        data: { results: HolidaySyncResult[] };
      }>("/holidays/sync", { year: visibleMonth.getUTCFullYear() });
      const imported = response.data.results.reduce(
        (total, result) => total + result.imported,
        0,
      );
      const unavailable = response.data.results.filter(
        ({ status }) => status !== "SYNCED",
      );
      setSyncMessage(
        unavailable.length
          ? `${imported} holidays imported. ${unavailable.map(({ officeName, message }) => `${officeName}: ${message}`).join(" ")}`
          : `${imported} new holidays imported. Existing HR changes were kept.`,
      );
      await load();
    } catch {
      setError("Public holidays could not be synchronized. Please retry.");
    } finally {
      setSyncing(false);
    }
  }
  const days = holidayCalendarDays(visibleMonth);
  const holidaysByDate = new Map<string, Holiday[]>();
  for (const holiday of data ?? []) {
    const date = holiday.holidayDate.slice(0, 10);
    holidaysByDate.set(date, [...(holidaysByDate.get(date) ?? []), holiday]);
  }
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data ?? [])
    .filter(({ holidayDate }) => holidayDate.slice(0, 10) >= today)
    .sort((left, right) => left.holidayDate.localeCompare(right.holidayDate))
    .slice(0, 12);
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const missingRegionOffices = offices.filter(
    ({ countryCode }) => !countryCode,
  );
  return (
    <AdminPage
      title="Holiday Calendar"
      description="Public holidays follow each office region. HR can add or override tenant-wide and office-specific dates."
      action={
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-primary disabled:opacity-50"
            disabled={syncing}
            onClick={syncPublicHolidays}
            type="button"
          >
            <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync public holidays"}
          </button>
          <PrimaryButton onClick={openCreate}>
            <Plus className="size-4" />
            Add holiday
          </PrimaryButton>
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {syncMessage && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-950">
          {syncMessage}
        </div>
      )}
      {missingRegionOffices.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <Globe2 className="size-5 shrink-0" />
          <p>
            Set the holiday country for{" "}
            {missingRegionOffices
              .map(({ officeName }) => officeName)
              .join(", ")}
            . Existing office pins will be detected automatically when edited.
          </p>
          <Link
            className="ml-auto font-semibold text-amber-950 underline underline-offset-4"
            href="/app/attendance/offices"
          >
            Update offices
          </Link>
        </div>
      )}
      {!data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-variant px-5 py-4">
              <button
                aria-label="Previous month"
                className="grid size-9 place-items-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                onClick={() =>
                  setVisibleMonth(
                    new Date(
                      Date.UTC(
                        visibleMonth.getUTCFullYear(),
                        visibleMonth.getUTCMonth() - 1,
                        1,
                      ),
                    ),
                  )
                }
                type="button"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-center">
                <h2 className="font-semibold text-zinc-900">{monthLabel}</h2>
                <p className="text-xs text-outline">
                  {offices.length} {offices.length === 1 ? "office" : "offices"}
                </p>
              </div>
              <button
                aria-label="Next month"
                className="grid size-9 place-items-center rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                onClick={() =>
                  setVisibleMonth(
                    new Date(
                      Date.UTC(
                        visibleMonth.getUTCFullYear(),
                        visibleMonth.getUTCMonth() + 1,
                        1,
                      ),
                    ),
                  )
                }
                type="button"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-outline">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => (
                    <div key={day} className="p-2">
                      {day}
                    </div>
                  ),
                )}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {days.map(({ date, day, inMonth }) => {
                  const holidays = holidaysByDate.get(date) ?? [];
                  return (
                    <div
                      key={date}
                      className={`min-h-24 rounded-lg border p-2 ${
                        !inMonth
                          ? "border-transparent bg-zinc-50/60 text-zinc-400"
                          : holidays.length
                            ? "border-blue-200 bg-blue-50"
                            : "border-surface-variant bg-white"
                      }`}
                    >
                      <span className="text-xs font-semibold">{day}</span>
                      {holidays.slice(0, 2).map((holiday) => (
                        <button
                          key={holiday.id}
                          className="mt-2 block text-left text-xs font-semibold text-zinc-500"
                          onClick={() => openEdit(holiday)}
                        >
                          {holiday.holidayName}
                        </button>
                      ))}
                      {holidays.length > 2 && (
                        <span className="mt-1 block text-[10px] font-semibold text-primary">
                          +{holidays.length - 2} more
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
          <Panel className="p-6">
            <div className="flex items-center gap-2">
              <Globe2 className="size-5 text-primary" />
              <h2 className="font-semibold">Upcoming holidays</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {upcoming.map((holiday) => (
                <button
                  key={holiday.id}
                  className="flex gap-3 rounded-lg bg-zinc-50 p-3 text-left"
                  onClick={() => openEdit(holiday)}
                >
                  <CalendarDays className="size-5 text-primary" />
                  <span>
                    <span className="block text-sm font-semibold">
                      {holiday.holidayName}
                    </span>
                    <span className="text-xs text-outline">
                      {new Date(holiday.holidayDate).toLocaleDateString()} ·{" "}
                      {holiday.office?.officeName ?? "All offices"}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                      {holiday.source === "PUBLIC_DATA"
                        ? `Imported${holiday.sourceProvider ? ` · ${holiday.sourceProvider}` : ""}`
                        : "Added by HR"}
                    </span>
                  </span>
                </button>
              ))}
              {!upcoming.length && (
                <p className="rounded-lg bg-zinc-50 p-4 text-sm text-outline">
                  No upcoming holidays. Sync a public calendar or add one
                  manually.
                </p>
              )}
            </div>
            <p className="mt-5 border-t border-surface-variant pt-4 text-[11px] leading-5 text-outline">
              Public data comes from the{" "}
              <a
                className="underline"
                href="https://gov.om/en/important-dates-and-holidays?entity=400196"
                rel="noreferrer"
                target="_blank"
              >
                Oman Ministry of Labour
              </a>{" "}
              for Oman, the{" "}
              <a
                className="underline"
                href="https://github.com/commenthol/date-holidays"
                rel="noreferrer"
                target="_blank"
              >
                date-holidays open dataset
              </a>{" "}
              where supported, or the keyless{" "}
              <a
                className="underline"
                href="https://tallyfy.com/national-holidays/"
                rel="noreferrer"
                target="_blank"
              >
                Tallyfy fallback
              </a>
              . HR edits always take precedence.
            </p>
          </Panel>
        </div>
      )}
      {open && (
        <Dialog
          error={error}
          title={editing ? "Edit holiday" : "Add holiday"}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        >
          <div className="grid gap-4">
            <Field label="Holiday name">
              <input
                className={inputClass}
                value={form.holidayName}
                onChange={(e) =>
                  setForm({ ...form, holidayName: e.target.value })
                }
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className={inputClass}
                value={form.holidayDate}
                onChange={(e) =>
                  setForm({ ...form, holidayDate: e.target.value })
                }
              />
            </Field>
            <Field label="Scope">
              <select
                className={inputClass}
                value={form.officeLocationId}
                onChange={(e) =>
                  setForm({ ...form, officeLocationId: e.target.value })
                }
              >
                <option value="">All offices</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.officeName}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-3">
              {editing && (
                <button
                  className="h-11 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                  onClick={removeHoliday}
                >
                  Delete
                </button>
              )}
              <PrimaryButton className="flex-1" onClick={saveHoliday}>
                Publish holiday
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
    </AdminPage>
  );
}

function holidayCalendarDays(month: Date) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, index - mondayOffset + 1));
    return {
      date: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
    };
  });
}

function OfficeMap({ offices }: { offices: Office[] }) {
  const locations = offices.flatMap((office) => {
    const coordinate = validCoordinate(office.latitude, office.longitude);
    return coordinate
      ? [
          {
            id: office.id,
            label: office.officeName,
            ...coordinate,
            radiusMeters: office.radiusMeters,
          },
        ]
      : [];
  });
  return (
    <FieldMap
      className="min-h-[420px]"
      geofences={locations}
      markers={locations.map(({ id, label, latitude, longitude }) => ({
        id,
        label,
        latitude,
        longitude,
      }))}
    />
  );
}

function OfficeLocationPicker({
  latitude,
  longitude,
  radiusMeters,
  onChange,
}: {
  latitude: string;
  longitude: string;
  radiusMeters: string;
  onChange: (coordinate: MapCoordinate, region?: OfficeRegion) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [detectingRegion, setDetectingRegion] = useState(false);
  const coordinate = validCoordinate(latitude, longitude);

  async function selectCoordinate(nextCoordinate: MapCoordinate) {
    setDetectingRegion(true);
    const region = await reverseGeocodeRegion(nextCoordinate).catch(
      () => undefined,
    );
    onChange(nextCoordinate, region);
    setDetectingRegion(false);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void selectCoordinate({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(searchQuery)}`,
      );
      const data = (await res.json()) as NominatimPlace[];
      if (data && data.length > 0) {
        const place = data[0];
        onChange(
          {
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon),
          },
          regionFromPlace(place),
        );
        setSearchQuery("");
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error(err);
      alert("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  const marker = coordinate
    ? [{ id: "office", label: "Office pin", ...coordinate }]
    : [];
  const geofence = coordinate
    ? [
        {
          id: "office",
          label: "Attendance boundary",
          ...coordinate,
          radiusMeters: Number(radiusMeters) || 150,
        },
      ]
    : [];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">Pin the office entrance</div>
          <div className="text-xs text-outline">
            Search for a location, click the map, or use your current location.
            The circle is the valid attendance area.
          </div>
        </div>
        <button
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-outline-variant bg-white px-3 text-sm font-semibold text-primary transition-colors hover:bg-stone-50"
          disabled={locating}
          onClick={useCurrentLocation}
          type="button"
        >
          <Crosshair className="size-4" />
          {locating || detectingRegion ? "Locating…" : "Use current location"}
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="size-4 text-outline" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search for a location (e.g., city, street, landmark)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      <FieldMap
        className="min-h-[280px]"
        geofences={geofence}
        markers={marker}
        onMapClick={(nextCoordinate) => void selectCoordinate(nextCoordinate)}
      />
      {!coordinate && (
        <p className="text-xs font-semibold text-amber-700">
          No office location selected yet.
        </p>
      )}
    </div>
  );
}

type NominatimPlace = {
  lat: string;
  lon: string;
  address?: Record<string, string | undefined>;
};

async function reverseGeocodeRegion(coordinate: MapCoordinate) {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    lat: String(coordinate.latitude),
    lon: String(coordinate.longitude),
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
  );
  if (!response.ok) return undefined;
  return regionFromPlace((await response.json()) as NominatimPlace);
}

function regionFromPlace(place: NominatimPlace): OfficeRegion | undefined {
  const countryCode = place.address?.country_code?.toUpperCase();
  if (!countryCode) return undefined;
  const subdivisionCode = Object.entries(place.address ?? {}).find(
    ([key, value]) =>
      key.startsWith("ISO3166-2") &&
      typeof value === "string" &&
      value.startsWith(`${countryCode}-`),
  )?.[1];
  return { countryCode, subdivisionCode };
}

function validCoordinate(
  latitude: string | number,
  longitude: string | number,
) {
  if (String(latitude).trim() === "" || String(longitude).trim() === "") {
    return null;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

function timezoneForCoordinate(
  latitude: string | number,
  longitude: string | number,
) {
  const coordinate = validCoordinate(latitude, longitude);
  if (!coordinate) return null;
  try {
    return timezoneLookup(coordinate.latitude, coordinate.longitude);
  } catch {
    return null;
  }
}
function Dialog({
  title,
  onClose,
  children,
  wide = false,
  error,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  error?: string;
}) {
  useEffect(() => {
    clearStaleScrollLock();
    return clearStaleScrollLock;
  }, []);
  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-zinc-900/45 p-4"
      role="dialog"
    >
      <div
        data-testid="dialog-panel"
        className={`${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-7 shadow-2xl`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-outline">
            Close
          </button>
        </div>
        {error && (
          <div className="mb-5">
            <ErrorState message={error} />
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

function clearStaleScrollLock() {
  for (const element of [document.documentElement, document.body]) {
    if (element.style.overflow === "hidden") {
      element.style.removeProperty("overflow");
    }
    if (element.style.overflowY === "hidden") {
      element.style.removeProperty("overflow-y");
    }
  }
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <div className="text-xs text-outline">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-50 px-3 py-1 text-on-surface-variant">
      <Check className="mr-1 inline size-3 text-emerald-800" />
      {children}
    </span>
  );
}
function trim(value: string) {
  return value.trim();
}
function sentenceCase(value: string) {
  const text = value.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function requestErrorMessage(error: unknown, fallback: string) {
  const data = (
    error as {
      response?: {
        data?: {
          message?: unknown;
          details?:
            | Array<{ field?: string; messages?: string[] }>
            | Record<string, unknown>;
        };
      };
    }
  ).response?.data;
  if (typeof data?.message === "string") return data.message;
  return fallback;
}
function assignmentKey(assignment: PolicyAssignment) {
  return `${assignment.scope}:${assignment.deptId ?? assignment.employeeId ?? "default"}`;
}
function policyCoverage(
  assignments: PolicyAssignment[],
  employees: Employee[],
) {
  if (assignments.some(({ scope }) => scope === "TENANT_DEFAULT"))
    return employees.length;
  const employeeIds = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.employeeId) employeeIds.add(assignment.employeeId);
    if (assignment.deptId) {
      for (const employee of employees) {
        if (employee.deptId === assignment.deptId) employeeIds.add(employee.id);
      }
    }
  }
  return employeeIds.size;
}
function assignmentLabel(
  assignment: PolicyAssignment,
  departments: Department[],
  employees: Employee[],
) {
  if (assignment.scope === "TENANT_DEFAULT") return "Tenant default";
  if (assignment.scope === "DEPARTMENT")
    return `Department · ${departments.find(({ id }) => id === assignment.deptId)?.name ?? "Unknown"}`;
  return `Employee · ${employees.find(({ id }) => id === assignment.employeeId)?.fullName ?? "Unknown"}`;
}
function dateRange(start: Date, end: Date) {
  const result: Date[] = [];
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = new Date(cursor.getTime() + 86_400_000)
  )
    result.push(cursor);
  return result;
}
function isWeeklyOffDate(value: unknown, date: Date) {
  if (!Array.isArray(value)) return false;
  const weekday = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
    date.getDay()
  ];
  const occurrence = Math.ceil(date.getDate() / 7);
  return value.some((entry) => {
    if (entry === weekday) return true;
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return false;
    const rule = entry as { weekday?: unknown; occurrences?: unknown };
    return (
      rule.weekday === weekday &&
      (rule.occurrences === undefined ||
        (Array.isArray(rule.occurrences) &&
          rule.occurrences.includes(occurrence)))
    );
  });
}
async function uploadRoster(
  file: File,
  setError: (message: string) => void,
  reload: () => void,
) {
  try {
    const presign = await apiClient.post("/rosters/imports/presign", {
      filename: file.name,
      contentType: file.type || "text/csv",
    });
    await fetch(presign.data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "text/csv" },
      body: file,
    });
    await apiClient.post("/rosters/imports", {
      objectKey: presign.data.objectKey,
      originalFilename: file.name,
      idempotencyKey: `${file.name}-${file.size}-${file.lastModified}`,
    });
    reload();
  } catch {
    setError("Roster CSV could not be uploaded or processed.");
  }
}
