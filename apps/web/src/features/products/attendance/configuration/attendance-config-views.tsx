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
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import timezoneLookup from "tz-lookup";
import { FeatureInfo } from "@/features/platform/help/feature-info";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { FieldMap, type MapCoordinate } from "@/features/products/attendance/field/field-map";
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
import { useTenantLocalization } from "@/lib/tenant-localization";
import { tenantMessage } from "@/i18n/tenant-message";

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
  allowEarlyCheckin: boolean;
  allowEarlyCheckout: boolean;
  allowBiometricOptOut: boolean;
  breakRules?: { paid?: boolean };
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

export function OfficesView({
  embedded = false,
  defaultTimezone = "",
  onReadinessChange,
}: {
  embedded?: boolean;
  defaultTimezone?: string;
  onReadinessChange?: (ready: boolean) => void;
} = {}) {
  const { tText } = useTenantLocalization();
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
    timezone: defaultTimezone,
    countryCode: "",
    subdivisionCode: "",
    egressIps: "",
    wifiSsids: "",
  });
  const onReadinessChangeRef = useRef(onReadinessChange);
  useEffect(() => {
    onReadinessChangeRef.current = onReadinessChange;
  }, [onReadinessChange]);
  const load = useCallback(
    () =>
      apiClient
        .get("/offices")
        .then(async (offices) => {
          const nextOffices = offices.data.data as Office[];
          setData(nextOffices);
          if (!embedded) {
            const employeeResult = await apiClient.get("/employees?limit=100");
            setEmployees(employeeResult.data.data);
          }
          onReadinessChangeRef.current?.(
            nextOffices.some(
              (office) =>
                Boolean(office.timezone && office.countryCode) &&
                office.radiusMeters >= 25 &&
                office.radiusMeters <= 10_000,
            ),
          );
          setError("");
        })
        .catch(() => {
          onReadinessChangeRef.current?.(false);
          setError(tText("Office locations could not be loaded."));
        }),
    [embedded, tText],
  );
  useEffect(() => {
    void load();
  }, [load]);
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
      !form.countryCode ||
      !Number.isInteger(radiusMeters) ||
      radiusMeters < 25 ||
      radiusMeters > 10_000
    ) {
      setError(
        tText(
          "Choose the office on the map, confirm its timezone, and enter a geofence radius between 25 and 10,000 meters.",
        ),
      );
      return;
    }
    const payload = {
      officeName: form.officeName.trim(),
      latitude,
      longitude,
      radiusMeters,
      timezone: form.timezone,
      countryCode: form.countryCode.toUpperCase(),
      ...(form.subdivisionCode ? { subdivisionCode: form.subdivisionCode.toUpperCase() } : {}),
      egressIps: form.egressIps.split(",").map(trim).filter(Boolean),
      wifiSsids: form.wifiSsids.split(",").map(trim).filter(Boolean),
    };
    await (editing ? apiClient.patch(`/offices/${editing.id}`, payload) : apiClient.post("/offices", payload))
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() => setError(tText("Office could not be saved. Check the geofence, network values, and references.")));
  }
  function openCreate() {
    setError("");
    setEditing(null);
    setForm({
      officeName: "",
      latitude: "",
      longitude: "",
      radiusMeters: "150",
      timezone: defaultTimezone,
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
      timezone: timezoneForCoordinate(office.latitude, office.longitude) ?? office.timezone ?? "",
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
  function updateOfficeCoordinate(latitude: number, longitude: number, region?: OfficeRegion) {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      timezone: timezoneForCoordinate(latitude, longitude) ?? current.timezone,
      countryCode: region?.countryCode ?? current.countryCode,
      subdivisionCode: region?.subdivisionCode ?? current.subdivisionCode,
    }));
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
        setError(tText("Office cannot be deleted while assignments, holidays, or attendance evidence reference it.")),
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
      setPrimaryIds(rows.filter((row) => row.isPrimary).map((row) => row.employeeId));
      setAssigning(office);
    } catch {
      setError(tText("Office assignments could not be loaded."));
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
      setError(tText("Office assignments could not be saved."));
    }
  }
  const firstOfficeSetup = embedded && data?.length === 0;
  const content = (
    <>
      {error && !open && !firstOfficeSetup && <ErrorState message={error} />}
      {!embedded && (
        <Panel className="mb-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="font-bold">{tText("How policy assignment works")}</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {tText(
                  "DeltCRM resolves one effective policy for each employee. A direct employee assignment wins over a department assignment, and a department assignment wins over the tenant default.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#151515]">
              <span className="rounded-full bg-zinc-100 px-3 py-2">{tText("Employee")}</span>
              <span>{tText("overrides")}</span>
              <span className="rounded-full bg-zinc-100 px-3 py-2">{tText("Department")}</span>
              <span>{tText("overrides")}</span>
              <span className="rounded-full bg-zinc-100 px-3 py-2">{tText("Tenant")}</span>
            </div>
          </div>
        </Panel>
      )}
      {!embedded && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p>
            <strong>{tText("Important:")}</strong>{" "}
            {tText(
              "Saving an office does not enforce its geofence by itself. Assign employees to the office and give them an attendance policy whose location rule is",
            )}{" "}
            <strong>{tText("Office geofence")}</strong>.
          </p>
          <Link className="font-bold text-[#151515]" href="/app/attendance/policies">
            {tText("Review attendance policies")}
          </Link>
        </div>
      )}
      {!data ? (
        <LoadingState />
      ) : firstOfficeSetup ? null : (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Panel className="overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_90px_130px] border-b border-surface-variant bg-zinc-50 px-6 py-3 text-xs font-bold uppercase tracking-wider text-outline">
              <span>{tText("Office")}</span>
              <span>{tText("Employees")}</span>
              <span>{tText("Radius")}</span>
              <span>{tText("Action")}</span>
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
                        : tText("Holiday region not set")}{" "}
                      · {office.timezone || tText("Tenant timezone")} · {(office.egressIps as string[]).length}{" "}
                      {tText("trusted networks")}
                    </div>
                  </div>
                  <span className="text-sm">{office._count?.assignments ?? 0}</span>
                  <span className="text-sm">{office.radiusMeters} m</span>
                  <div className="flex gap-3">
                    {!embedded && (
                      <button
                        className="text-left text-xs font-semibold text-[#151515]"
                        onClick={() => openAssignments(office)}
                      >
                        {tText("Assign")}
                      </button>
                    )}
                    <button className="text-left text-xs font-semibold text-[#151515]" onClick={() => openEdit(office)}>
                      {tText("Edit")}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title={tText("No offices yet")}
                body={tText("Add an office to configure its circular geofence and network allow-list.")}
              />
            )}
          </Panel>
          <OfficeMap offices={data} />
        </div>
      )}
      {(open || firstOfficeSetup) && (
        <Dialog
          error={error}
          inline={firstOfficeSetup}
          wide
          title={firstOfficeSetup ? tText("Office details") : editing ? tText("Edit office") : tText("Add office")}
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
              onChange={({ latitude, longitude }, region) => updateOfficeCoordinate(latitude, longitude, region)}
            />
            <Field label={tText("Office name")}>
              <input
                autoFocus
                className={inputClass}
                value={form.officeName}
                onChange={(e) => setForm({ ...form, officeName: e.target.value })}
              />
            </Field>
            <Field label={tText("Radius in meters")} helpKey="location-verification">
              <input
                type="number"
                className={inputClass}
                value={form.radiusMeters}
                onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
              />
            </Field>
            <Field label={tText("Timezone")}>
              <TimezoneSelect
                value={form.timezone}
                onChange={(timezone) => setForm({ ...form, timezone })}
                description={tText(
                  "Detected from the office pin. You can override it if the location is near a timezone boundary.",
                )}
                showDetect={false}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={tText("Holiday country")}>
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
                <p className="mt-1 text-xs text-outline">{tText("ISO country code detected from the office pin.")}</p>
              </Field>
              <Field label={tText("State or region")}>
                <input
                  className={inputClass}
                  maxLength={16}
                  placeholder={tText("IN-KA")}
                  value={form.subdivisionCode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      subdivisionCode: event.target.value.toUpperCase(),
                    })
                  }
                />
                <p className="mt-1 text-xs text-outline">{tText("Optional ISO 3166-2 subdivision code.")}</p>
              </Field>
            </div>
            <Field label={tText("Egress IPs or CIDRs")}>
              <input
                className={inputClass}
                placeholder="203.0.113.10, 10.0.0.0/24"
                value={form.egressIps}
                onChange={(e) => setForm({ ...form, egressIps: e.target.value })}
              />
            </Field>
            <Field label={tText("Advisory Wi-Fi SSIDs")}>
              <input
                className={inputClass}
                value={form.wifiSsids}
                onChange={(e) => setForm({ ...form, wifiSsids: e.target.value })}
              />
            </Field>
            <div className="flex gap-3">
              {editing && (
                <button
                  className="h-11 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                  onClick={removeOffice}
                >
                  {tText("Delete")}
                </button>
              )}
              <PrimaryButton className="flex-1" onClick={saveOffice}>
                {tText("Save office")}
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
      {assigning && (
        <Dialog error={error} title={`Assign employees · ${assigning.officeName}`} onClose={() => setAssigning(null)}>
          <div className="grid max-h-96 gap-2 overflow-auto">
            {employees.map((employee) => (
              <div key={employee.id} className="grid grid-cols-[1fr_auto] items-center rounded-lg bg-zinc-50 p-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={assignedIds.includes(employee.id)}
                    onChange={(event) => {
                      setAssignedIds((current) =>
                        event.target.checked ? [...current, employee.id] : current.filter((id) => id !== employee.id),
                      );
                      if (!event.target.checked) setPrimaryIds((current) => current.filter((id) => id !== employee.id));
                    }}
                  />
                  <span>
                    <strong>{employee.fullName}</strong>
                    <span className="block text-xs text-outline">{employee.employeeCode}</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    disabled={!assignedIds.includes(employee.id)}
                    checked={primaryIds.includes(employee.id)}
                    onChange={(event) =>
                      setPrimaryIds((current) =>
                        event.target.checked ? [...current, employee.id] : current.filter((id) => id !== employee.id),
                      )
                    }
                  />
                  {tText("Primary")}
                </label>
              </div>
            ))}
          </div>
          <PrimaryButton className="mt-5 w-full" onClick={saveAssignments}>
            {tText("Save assignments")}
          </PrimaryButton>
        </Dialog>
      )}
    </>
  );

  const addOfficeAction = (
    <PrimaryButton onClick={openCreate}>
      <Plus className="size-4" />
      {tText("Add office")}
    </PrimaryButton>
  );

  if (embedded) {
    return (
      <section className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {firstOfficeSetup ? tText("Configure the office location") : tText("Office Locations & Geofences")}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {firstOfficeSetup
                ? tText("Pin the workplace entrance, confirm its region, and set the attendance boundary.")
                : tText("Add at least one office and confirm its detected region before continuing.")}
            </p>
          </div>
          {!firstOfficeSetup && addOfficeAction}
        </div>
        {content}
      </section>
    );
  }

  return (
    <AdminPage
      title={tText("Office Locations & Geofences")}
      description={tText("Control where employees may securely record attendance.")}
      action={addOfficeAction}
    >
      {content}
    </AdminPage>
  );
}

export function PoliciesView() {
  const { tText } = useTenantLocalization();
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
    allowEarlyCheckin: true,
    allowEarlyCheckout: false,
    allowBiometricOptOut: false,
    breakRules: { paid: false },
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
  const [ruleSaving, setRuleSaving] = useState(false);
  const ruleValidationError = validatePolicyRuleForm(ruleForm);
  const load = () =>
    Promise.all([
      apiClient.get("/attendance-policies"),
      apiClient.get("/departments"),
      apiClient.get("/employees?limit=100"),
      permissions.includes("attendance.config.read") || permissions.includes("attendance.config.manage")
        ? apiClient.get("/workspace/attendance-capabilities").catch(() => null)
        : Promise.resolve(null),
      focusedEmployeeId ? apiClient.get(`/employees/${focusedEmployeeId}`) : Promise.resolve(null),
      focusedEmployeeId
        ? apiClient
            .get(
              `/attendance-policies/resolve?employeeId=${focusedEmployeeId}&date=${new Date().toISOString().slice(0, 10)}`,
            )
            .catch(() => null)
        : Promise.resolve(null),
    ])
      .then(
        ([policies, departmentResult, employeeResult, capabilityResult, focusedEmployeeResult, resolutionResult]) => {
          const policyRows = policies.data.data as Policy[];
          setData(policyRows);
          setDepartments(departmentResult.data.data);
          setEmployees(employeeResult.data.data);
          if (capabilityResult) setCapabilities(capabilityResult.data.data);
          if (focusedEmployeeResult) {
            setFocusedEmployee(focusedEmployeeResult.data.data);
            const directPolicy = policyRows.find((policy) =>
              policy.assignments.some(
                (assignment) => assignment.scope === "EMPLOYEE" && assignment.employeeId === focusedEmployeeId,
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
      .catch(() => setError(tText("Policies could not be loaded.")));
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
      .catch(() => setError(tText("Policy could not be created.")));
  }
  function addAssignment() {
    const next: PolicyAssignment =
      assignmentForm.scope === "TENANT_DEFAULT"
        ? { scope: "TENANT_DEFAULT" }
        : assignmentForm.scope === "DEPARTMENT"
          ? { scope: "DEPARTMENT", deptId: assignmentForm.targetId }
          : { scope: "EMPLOYEE", employeeId: assignmentForm.targetId };
    const key = assignmentKey(next);
    if (!assignmentForm.targetId && assignmentForm.scope !== "TENANT_DEFAULT") return;
    if (!assignments.some((item) => assignmentKey(item) === key)) setAssignments((current) => [...current, next]);
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
      setError(requestErrorMessage(caught, "Policy assignments conflict with an existing scope or target."));
    }
  }
  async function saveFocusedEmployeePolicy() {
    if (!focusedEmployeeId) return;
    setFocusedSaving(true);
    setFocusedError("");
    try {
      await apiClient.put(`/attendance-policies/employees/${focusedEmployeeId}`, { policyId: focusedPolicyId || null });
      router.push(returnTo);
    } catch (caught) {
      setFocusedError(requestErrorMessage(caught, "This employee policy could not be updated."));
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
      allowEarlyCheckin: policy.allowEarlyCheckin ?? true,
      allowEarlyCheckout: policy.allowEarlyCheckout ?? false,
      allowBiometricOptOut: policy.allowBiometricOptOut ?? false,
      breakRules: { paid: policy.breakRules?.paid === true },
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
    if (!ruleEditing || ruleValidationError) return;
    setRuleSaving(true);
    setError("");
    try {
      if (ruleForm.fieldTrackingEnabled && capabilities?.fieldTrackingEnabled === false) {
        const capabilityResponse = await apiClient.patch("/workspace/attendance-capabilities", {
          fieldTrackingEnabled: true,
          fieldTrackingIntervalMin: capabilities.fieldTrackingIntervalMin || 15,
        });
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
    } finally {
      setRuleSaving(false);
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
      .catch(() => setError(tText("Assigned policies cannot be deleted.")));
  }
  return (
    <AdminPage
      title={tText("Attendance Policies")}
      description={tText(
        "Define verification and work-time rules, then assign by employee, department or tenant default.",
      )}
      action={
        <PrimaryButton onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          {tText("Create policy")}
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
                <div className="grid size-11 place-items-center rounded-xl bg-zinc-100 text-[#151515]">
                  <ShieldCheck />
                </div>
                <span className="rounded-full bg-emerald-300/35 px-3 py-1 text-xs font-semibold text-emerald-900">
                  {policyCoverage(policy.assignments, employees)} {tText("employees")}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{policy.name}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Metric label={tText("Late after")} value={formatPolicyDuration(policy.lateAfterMinutes)} />
                <Metric label={tText("Half day")} value={formatPolicyDuration(policy.halfDayAfterMinutes)} />
                <Metric label={tText("Minimum work")} value={formatPolicyDuration(policy.minimumWorkMinutes)} />
                <Metric label={tText("Overtime")} value={formatPolicyDuration(policy.overtimeAfterMinutes)} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
                {policy.locationMode !== "NONE" && (
                  <Tag>{policy.locationMode === "OFFICE_GEOFENCE" ? tText("Office geofence") : tText("Field GPS")}</Tag>
                )}
                {policy.requireRegisteredDevice && <Tag>{tText("Registered device")}</Tag>}
                {policy.selfieMode === "REQUIRED" && <Tag>{tText("Selfie")}</Tag>}
                {policy.fieldTrackingEnabled && <Tag>{tText("Field tracking")}</Tag>}
              </div>
              <div className="mt-5 flex gap-4">
                <button className="text-sm font-semibold text-[#151515]" onClick={() => openRuleEditor(policy)}>
                  {tText("Edit rules")}
                </button>
                <button
                  className="text-sm font-semibold text-[#151515]"
                  onClick={() => {
                    setEditing(policy);
                    setAssignments(policy.assignments);
                  }}
                >
                  {tText("Manage assignments")}
                </button>
              </div>
            </Panel>
          ))}
          {!data.length && (
            <Panel className="lg:col-span-2 xl:col-span-3">
              <EmptyState
                title={tText("No policies")}
                body={tText("Create a policy and assign one tenant default before attendance begins.")}
              />
            </Panel>
          )}
        </div>
      )}
      {open && (
        <Dialog error={error} title={tText("Create attendance policy")} onClose={() => setOpen(false)}>
          <Field label={tText("Policy name")}>
            <input autoFocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm text-on-surface-variant">
            {tText("New policies start with secure default thresholds and can be refined after creation.")}
          </div>
          <PrimaryButton className="mt-5 w-full" onClick={create}>
            {tText("Create policy")}
          </PrimaryButton>
        </Dialog>
      )}
      {editing && (
        <Dialog error={error} title={`Assignments · ${editing.name}`} onClose={() => setEditing(null)}>
          <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-on-surface-variant">
            {tText(
              "Assign the broad tenant default first, use department assignments for team-specific rules, and use employee assignments only for approved exceptions. This policy currently resolves directly for approximately",
            )}
            {policyCoverage(assignments, employees)}{" "}
            {tText("employees; a higher-priority assignment on another policy may override it.")}
          </div>
          <div className="grid gap-3">
            {assignments.map((assignment) => (
              <div
                key={assignmentKey(assignment)}
                className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 text-sm"
              >
                <span>{assignmentLabel(assignment, departments, employees)}</span>
                <button
                  className="text-xs font-semibold text-error"
                  onClick={() =>
                    setAssignments((current) =>
                      current.filter((item) => assignmentKey(item) !== assignmentKey(assignment)),
                    )
                  }
                >
                  {tText("Remove")}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 rounded-xl border border-surface-variant p-4">
            <Field label={tText("Scope")} helpKey="policies">
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
                <option value="TENANT_DEFAULT">{tText("Tenant default")}</option>
                <option value="DEPARTMENT">{tText("Department")}</option>
                <option value="EMPLOYEE">{tText("Employee")}</option>
              </select>
            </Field>
            {assignmentForm.scope === "DEPARTMENT" && (
              <Field label={tText("Department")}>
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
                  <option value="">{tText("Select department")}</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {assignmentForm.scope === "EMPLOYEE" && (
              <Field label={tText("Employee")}>
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
                  <option value="">{tText("Select employee")}</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <button
              className="h-10 rounded-lg border border-[#151515] text-sm font-semibold text-[#151515]"
              onClick={addAssignment}
            >
              {tText("Add assignment")}
            </button>
          </div>
          <PrimaryButton className="mt-5 w-full" onClick={saveAssignments}>
            {tText("Save assignments")}
          </PrimaryButton>
        </Dialog>
      )}
      {focusedEmployeeId && focusedEmployee && data && (
        <Dialog title={`Attendance policy · ${focusedEmployee.fullName}`} onClose={() => router.push(returnTo)}>
          {focusedError && <ErrorState message={focusedError} />}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-on-surface-variant">
            {tText(
              "Choose one predefined policy for this employee. An employee policy overrides department and tenant defaults. Choose inherited policy to remove the employee-specific exception.",
            )}
          </div>
          {focusedResolution && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 p-4 text-sm">
              <span className="text-zinc-500">{tText("Currently effective")}</span>
              <strong>
                {focusedResolution.policyName} · {sentenceCase(focusedResolution.source)}
              </strong>
            </div>
          )}
          <fieldset className="mt-5 grid gap-3">
            <legend className="mb-1 text-sm font-bold">
              {tText("Policy for")}
              {focusedEmployee.fullName}
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
                <strong className="block text-sm">{tText("Use inherited policy")}</strong>
                <span className="mt-1 block text-xs leading-5 text-outline">
                  {tText("Use the employee&apos;s department policy, then tenant default.")}
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
                    {policy.locationMode.replaceAll("_", " ")} {tText("· Selfie")} {policy.selfieMode.toLowerCase()}{" "}
                    {tText("· Device")} {policy.requireRegisteredDevice ? tText("required") : tText("optional")}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <PrimaryButton className="mt-5 w-full" disabled={focusedSaving} onClick={saveFocusedEmployeePolicy}>
            {focusedSaving ? tText("Saving policy…") : tText("Save employee policy")}
          </PrimaryButton>
        </Dialog>
      )}
      {ruleEditing && (
        <Dialog error={error} title={tText("Edit policy rules")} onClose={() => setRuleEditing(null)} wide>
          <div className="grid gap-4">
            <Field label={tText("Policy name")}>
              <input
                className={inputClass}
                value={ruleForm.name}
                onChange={(event) => setRuleForm({ ...ruleForm, name: event.target.value })}
              />
            </Field>
            <div className="rounded-xl border border-surface-variant p-5">
              <h3 className="font-bold">{tText("Attendance calculation")}</h3>
              <p className="mt-1 text-xs leading-5 text-outline">
                {tText("Use hours and minutes to define how each completed attendance day is classified.")}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DurationField
                  id="late-grace"
                  label={tText("Late grace period")}
                  description={tText("Time allowed after the shift starts before the employee is marked late.")}
                  value={ruleForm.lateAfterMinutes}
                  onChange={(lateAfterMinutes) => setRuleForm({ ...ruleForm, lateAfterMinutes })}
                />
                <DurationField
                  id="half-day-late"
                  label={tText("Half-day when late by")}
                  description={tText("A later arrival reaches half-day status at this threshold.")}
                  value={ruleForm.halfDayAfterMinutes}
                  onChange={(halfDayAfterMinutes) => setRuleForm({ ...ruleForm, halfDayAfterMinutes })}
                />
                <DurationField
                  id="minimum-work"
                  label={tText("Minimum work for a full day")}
                  description={tText("Worked time below this threshold is treated as a half-day.")}
                  value={ruleForm.minimumWorkMinutes}
                  onChange={(minimumWorkMinutes) => setRuleForm({ ...ruleForm, minimumWorkMinutes })}
                />
                <DurationField
                  id="overtime-after"
                  label={tText("Overtime starts after")}
                  description={tText("Worked time beyond this threshold is counted as overtime.")}
                  value={ruleForm.overtimeAfterMinutes}
                  onChange={(overtimeAfterMinutes) => setRuleForm({ ...ruleForm, overtimeAfterMinutes })}
                />
              </div>
              {ruleValidationError && (
                <p
                  className="mt-4 rounded-lg border border-error/30 bg-error-container px-3 py-2 text-sm font-medium text-on-error-container"
                  role="alert"
                >
                  {tText(ruleValidationError)}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-surface-variant p-5">
              <h3 className="font-bold">{tText("Punch timing and breaks")}</h3>
              <p className="mt-1 text-xs leading-5 text-outline">
                {tText("Control punches outside the shift window and how recorded breaks affect worked time.")}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PolicyToggle
                  checked={ruleForm.allowEarlyCheckin}
                  label={tText("Allow check-in before shift start")}
                  description={tText("Employees can begin attendance before their scheduled shift.")}
                  onChange={(allowEarlyCheckin) => setRuleForm({ ...ruleForm, allowEarlyCheckin })}
                />
                <PolicyToggle
                  checked={ruleForm.allowEarlyCheckout}
                  label={tText("Allow checkout before shift end")}
                  description={tText("Employees can close attendance before their scheduled shift ends.")}
                  onChange={(allowEarlyCheckout) => setRuleForm({ ...ruleForm, allowEarlyCheckout })}
                />
                <PolicyToggle
                  checked={ruleForm.breakRules.paid}
                  label={tText("Count breaks as paid working time")}
                  description={tText("Recorded break minutes will not be deducted from total worked time.")}
                  onChange={(paid) => setRuleForm({ ...ruleForm, breakRules: { paid } })}
                />
                <div className="rounded-xl border border-dashed border-surface-variant p-4 text-sm text-on-surface-variant">
                  <p className="font-semibold text-on-surface">{tText("Shift and weekly-off schedule")}</p>
                  <p className="mt-1 text-xs leading-5">
                    {tText("Shift times, overnight shifts, rosters, and weekly offs are managed in Schedule.")}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-surface-variant p-4">
              <h3 className="font-bold">{tText("Punch verification")}</h3>
              <p className="mt-1 text-xs leading-5 text-outline">
                {tText("Choose what the employee must verify during check-in and check-out.")}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field helpKey="location-verification" label={tText("Location verification")}>
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
                    <option value="NONE">{tText("No location required")}</option>
                    <option value="OFFICE_GEOFENCE">{tText("Office geofence")}</option>
                    <option value="FIELD_GPS">{tText("Current GPS location")}</option>
                  </select>
                </Field>
                {capabilities?.biometricEnforcementAvailable !== false && (
                  <Field helpKey="selfie-verification" label={tText("Selfie verification")}>
                    <select
                      className={inputClass}
                      value={ruleForm.selfieMode}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          selfieMode: event.target.value as SelfieMode,
                          allowBiometricOptOut:
                            event.target.value === "REQUIRED" ? ruleForm.allowBiometricOptOut : false,
                        })
                      }
                    >
                      <option value="DISABLED">{tText("Not required")}</option>
                      <option value="REQUIRED">{tText("Required")}</option>
                    </select>
                  </Field>
                )}
                {capabilities?.biometricEnforcementAvailable !== false && ruleForm.selfieMode === "REQUIRED" && (
                  <>
                    <Field helpKey="selfie-verification" label={tText("Maximum face attempts")}>
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
                    <PolicyToggle
                      checked={ruleForm.allowBiometricOptOut}
                      label={tText("Allow biometric consent opt-out")}
                      description={tText("Employees without biometric consent may punch without a selfie.")}
                      onChange={(allowBiometricOptOut) =>
                        setRuleForm({
                          ...ruleForm,
                          allowBiometricOptOut,
                        })
                      }
                    />
                  </>
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
                  {tText("Require an HR-approved registered device")}
                </label>
                <FeatureInfo className="ml-auto" helpKey="devices" />
              </div>
            </div>
            <div className="rounded-xl border border-surface-variant p-4">
              <h3 className="font-bold">{tText("Offline attendance")}</h3>
              <p className="mt-1 text-xs leading-5 text-outline">
                {tText("Allow a stored punch to sync when the employee regains connectivity.")}
              </p>
              <div className="mt-4 max-w-xs">
                <Field label={tText("Maximum offline sync delay (hours)")}>
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
                <h3 className="font-bold">{tText("Field workforce tracking")}</h3>
                <p className="mt-1 text-xs leading-5 text-outline">
                  {tText("Optional continuous route tracking for eligible field employees.")}
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
                          allowHybridFieldTracking: event.target.checked ? ruleForm.allowHybridFieldTracking : false,
                        })
                      }
                    />
                    {tText("Enable field tracking for field employees")}
                  </label>
                  <FeatureInfo className="ml-auto" helpKey="background-tracking" />
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
                    {tText("Also allow tracking for hybrid employees")}
                  </label>
                )}
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{tText("Employee app impact")}</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {tText("Employees using this policy will")}{" "}
                {ruleForm.locationMode === "NONE"
                  ? tText("not be asked for location")
                  : ruleForm.locationMode === "OFFICE_GEOFENCE"
                    ? tText("verify an office geofence")
                    : tText("submit field GPS")}
                , {ruleForm.selfieMode === "REQUIRED" ? tText("take a selfie") : tText("skip the selfie step")}
                {tText(", and")}{" "}
                {ruleForm.fieldTrackingEnabled
                  ? tText("see field tracking when their work type allows it")
                  : tText("not see field tracking")}
                .
              </p>
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                {tText("Dependencies to verify")}
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">
                {ruleForm.locationMode === "OFFICE_GEOFENCE" && (
                  <li>{tText("- Every affected employee needs an assigned office.")}</li>
                )}
                {ruleForm.locationMode === "FIELD_GPS" && (
                  <li>{tText("- Employee devices must grant precise location access.")}</li>
                )}
                {ruleForm.selfieMode === "REQUIRED" && (
                  <li>{tText("- Employees need active consent and face enrollment.")}</li>
                )}
                {ruleForm.requireRegisteredDevice && (
                  <li>{tText("- HR must approve a registered employee device.")}</li>
                )}
                {ruleForm.fieldTrackingEnabled && (
                  <li>
                    {tText("- Field tracking entitlement and background location permission must remain active.")}
                  </li>
                )}
                {ruleForm.locationMode === "NONE" &&
                  ruleForm.selfieMode === "DISABLED" &&
                  !ruleForm.requireRegisteredDevice && (
                    <li>
                      {tText(
                        "- This policy accepts punches without location, selfie, or device trust. Confirm that this matches the security risk.",
                      )}
                    </li>
                  )}
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                className="h-11 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                onClick={removePolicy}
              >
                {tText("Delete")}
              </button>
              <PrimaryButton
                className="flex-1"
                disabled={Boolean(ruleValidationError) || ruleSaving}
                onClick={saveRules}
              >
                {ruleSaving ? tText("Saving rules…") : tText("Save rules")}
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
    </AdminPage>
  );
}

export function ShiftsView() {
  const { tText } = useTenantLocalization();
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
      .catch(() => setError(tText("Shifts could not be loaded.")));
  useEffect(() => {
    void load();
  }, []);
  async function saveShift() {
    await (editing ? apiClient.patch(`/shifts/${editing.id}`, form) : apiClient.post("/shifts", form))
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() => setError(tText("Shift could not be saved.")));
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
      .catch(() => setError(tText("Shift is referenced by employees, rosters, or attendance records.")));
  }
  return (
    <AdminPage
      title={tText("Shifts Management")}
      description={tText("Create day and overnight shifts with deterministic date attribution.")}
      action={
        <PrimaryButton onClick={openCreate}>
          <Plus className="size-4" />
          {tText("Add new shift")}
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
                <div className="grid size-11 place-items-center rounded-xl bg-zinc-100 text-[#151515]">
                  <Clock3 />
                </div>
                {shift.isOvernight && (
                  <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                    {tText("Overnight")}
                  </span>
                )}
              </div>
              <h2 className="mt-5 text-lg font-semibold">{shift.name}</h2>
              <div className="mt-5 flex items-center gap-4">
                <strong className="text-2xl">{shift.startTime}</strong>
                <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-primary to-emerald-300" />
                <strong className="text-2xl">{shift.endTime}</strong>
              </div>
              <button className="mt-5 text-sm font-semibold text-[#151515]" onClick={() => openEdit(shift)}>
                {tText("Edit shift")}
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
            <Field label={tText("Shift name")}>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={tText("Starts")}>
                <input
                  type="time"
                  className={inputClass}
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </Field>
              <Field label={tText("Ends")}>
                <input
                  type="time"
                  className={inputClass}
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex gap-3">
              {editing && (
                <button
                  className="h-11 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                  onClick={removeShift}
                >
                  {tText("Delete")}
                </button>
              )}
              <PrimaryButton className="flex-1" onClick={saveShift}>
                {tText("Save shift")}
              </PrimaryButton>
            </div>
          </div>
        </Dialog>
      )}
    </AdminPage>
  );
}

export function RostersView() {
  const { tText } = useTenantLocalization();
  const today = new Date();
  const end = new Date(today.getTime() + 6 * 86_400_000);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const [data, setData] = useState<Roster[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [settings, setSettings] = useState<TenantScheduleSettings | null>(null);
  const [policyByEmployee, setPolicyByEmployee] = useState<Record<string, ResolvedPolicy["policy"]>>({});
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
          const result = await apiClient.post("/attendance-policies/resolve/bulk", {
            employeeIds: loadedEmployees.map(({ id }) => id),
            date: iso(today),
          });
          setPolicyByEmployee(
            Object.fromEntries((result.data.data as ResolvedPolicy[]).map((item) => [item.employeeId, item.policy])),
          );
        } catch {
          // Tenant working-week settings remain the safe inherited fallback.
          setPolicyByEmployee({});
        }
      })
      .catch(() => setError(tText("Roster planner could not be loaded.")));
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
      setError(tText("Bulk roster assignment could not be completed."));
    }
  }
  async function removeRoster(roster: Roster) {
    if (!window.confirm(`Remove ${roster.shift.name} for ${roster.employee.fullName}?`)) return;
    await apiClient
      .delete(`/rosters/${roster.id}`)
      .then(() => load())
      .catch(() => setError(tText("Roster assignment could not be removed.")));
  }
  return (
    <AdminPage
      title={tText("Roster Planner")}
      description={tText("Plan the working week, bulk assign shifts and import validated CSV schedules.")}
      action={
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold">
            <Upload className="size-4" />
            {tText("Import CSV")}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => event.target.files?.[0] && uploadRoster(event.target.files[0], setError, load)}
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
            {tText("Assign shift")}
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
              <div className="p-4 text-xs font-bold uppercase text-outline">{tText("Employee")}</div>
              {dateRange(today, end).map((date) => (
                <div
                  key={date.toISOString()}
                  className="border-l border-surface-variant p-4 text-center text-xs font-bold"
                >
                  <div>{date.toLocaleDateString("en", { weekday: "short" })}</div>
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
                  <div className="text-xs text-outline">{employee.employeeCode}</div>
                </div>
                {dateRange(today, end).map((date) => {
                  const roster = data.find(
                    (row) =>
                      row.employee.employeeCode === employee.employeeCode && row.rosterDate.slice(0, 10) === iso(date),
                  );
                  const weeklyOffs = policyByEmployee[employee.id]?.weeklyOffs ?? settings?.weeklyOffs;
                  const weeklyOff = !roster && isWeeklyOffDate(weeklyOffs, date);
                  const inheritedShift = employee.defaultShift;
                  const inheritedHours = settings && `${settings.workingDayStart}-${settings.workingDayEnd}`;
                  return (
                    <div
                      key={date.toISOString()}
                      className="grid min-h-16 place-items-center border-l border-surface-variant p-2"
                    >
                      {roster ? (
                        <button
                          title={tText("Remove roster")}
                          className="rounded-lg bg-[#f3efe6] px-2 py-1 text-center text-xs font-semibold text-[#151515]"
                          onClick={() => removeRoster(roster)}
                        >
                          <span className="block">{roster.shift.name}</span>
                          <span className="block text-[10px] font-medium text-[#151515]">{tText("Roster")}</span>
                        </button>
                      ) : (
                        <button
                          className={`flex h-full w-full items-center justify-center rounded-lg px-1 text-center hover:bg-zinc-100/50 ${weeklyOff ? "bg-slate-50" : "bg-emerald-50/50"}`}
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
                            <span className="text-xs font-semibold text-slate-500">{tText("Weekly off")}</span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700">
                              <span className="block">
                                {inheritedShift?.name ?? inheritedHours ?? tText("Working day")}
                              </span>
                              <span className="block text-[10px] font-medium text-emerald-500">
                                {tText("Inherited")}
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
                title={tText("No employees")}
                body={tText("Create employees before assigning weekly rosters.")}
              />
            )}
          </div>
        </Panel>
      )}
      {bulkOpen && (
        <Dialog error={error} title={tText("Assign shift(s)")} onClose={() => setBulkOpen(false)}>
          <div className="grid gap-4">
            <Field label={tText("Shift")}>
              <select
                className={inputClass}
                value={bulkForm.shiftId}
                onChange={(event) => setBulkForm({ ...bulkForm, shiftId: event.target.value })}
              >
                <option value="">{tText("Select shift")}</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tText("Start date")}>
                <input
                  type="date"
                  className={inputClass}
                  value={bulkForm.startDate}
                  onChange={(event) => setBulkForm({ ...bulkForm, startDate: event.target.value })}
                />
              </Field>
              <Field label={tText("End date")}>
                <input
                  type="date"
                  className={inputClass}
                  value={bulkForm.endDate}
                  onChange={(event) => setBulkForm({ ...bulkForm, endDate: event.target.value })}
                />
              </Field>
            </div>
            <fieldset className="grid max-h-64 gap-2 overflow-auto">
              <legend className="mb-2 text-sm font-medium">{tText("Employees")}</legend>
              {employees.map((employee) => (
                <label key={employee.id} className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={bulkForm.employeeIds.includes(employee.id)}
                    onChange={(event) =>
                      setBulkForm((current) => ({
                        ...current,
                        employeeIds: event.target.checked
                          ? [...current.employeeIds, employee.id]
                          : current.employeeIds.filter((id) => id !== employee.id),
                      }))
                    }
                  />
                  {employee.fullName}
                </label>
              ))}
            </fieldset>
            {bulkResult && <div className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-900">{bulkResult}</div>}
            <PrimaryButton disabled={!bulkForm.shiftId || !bulkForm.employeeIds.length} onClick={bulkAssign}>
              {tText("Apply shift")}
            </PrimaryButton>
          </div>
        </Dialog>
      )}
    </AdminPage>
  );
}

export function HolidaysView() {
  const { tText } = useTenantLocalization();
  const [data, setData] = useState<Holiday[] | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState({
    holidayName: "",
    holidayDate: "",
    officeLocationId: "",
  });
  const initialMonthSelected = useRef(false);
  const load = () =>
    Promise.all([apiClient.get("/holidays"), apiClient.get("/offices")])
      .then(([holidays, officeResult]) => {
        const loadedHolidays = holidays.data.data as Holiday[];
        setData(loadedHolidays);
        setOffices(officeResult.data.data);
        setError("");
        if (!initialMonthSelected.current && loadedHolidays.length) {
          const today = new Date().toISOString().slice(0, 10);
          const ordered = [...loadedHolidays].sort((left, right) => left.holidayDate.localeCompare(right.holidayDate));
          const nearest =
            ordered.find(({ holidayDate }) => holidayDate.slice(0, 10) >= today) ?? ordered[ordered.length - 1];
          if (nearest) {
            setVisibleMonth(monthStart(nearest.holidayDate));
            initialMonthSelected.current = true;
          }
        }
        return {
          holidays: loadedHolidays,
          offices: officeResult.data.data as Office[],
        };
      })
      .catch(() => setError(tText("Holiday calendar could not be loaded.")));
  useEffect(() => {
    let active = true;
    void load().then(async (result) => {
      if (!active || !result || !result.offices.some(({ countryCode }) => !countryCode)) {
        return;
      }
      setSyncing(true);
      try {
        await apiClient.post("/holidays/sync", {
          year: new Date().getUTCFullYear(),
        });
        if (active) await load();
      } catch {
        if (active) {
          setError(tText("Office regions and public holidays could not be detected. Please retry."));
        }
      } finally {
        if (active) setSyncing(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  async function saveHoliday() {
    const payload = {
      holidayName: form.holidayName,
      holidayDate: form.holidayDate,
      ...(form.officeLocationId ? { officeLocationId: form.officeLocationId } : {}),
    };
    await (editing ? apiClient.patch(`/holidays/${editing.id}`, payload) : apiClient.post("/holidays", payload))
      .then(() => {
        setOpen(false);
        setEditing(null);
        load();
      })
      .catch(() => setError(tText("Holiday already exists for this date and scope.")));
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
      .catch(() => setError(tText("Holiday could not be deleted.")));
  }
  async function syncPublicHolidays() {
    setSyncing(true);
    setError("");
    setSyncMessage("");
    try {
      const { data: response } = await apiClient.post<{
        data: { results: HolidaySyncResult[] };
      }>("/holidays/sync", { year: visibleMonth.getUTCFullYear() });
      const imported = response.data.results.reduce((total, result) => total + result.imported, 0);
      const unavailable = response.data.results.filter(({ status }) => status !== "SYNCED");
      setSyncMessage(
        unavailable.length
          ? `${imported} holidays imported. ${unavailable.map(({ officeName, message }) => `${officeName}: ${message}`).join(" ")}`
          : `${imported} new holidays imported. Existing HR changes were kept.`,
      );
      await load();
    } catch {
      setError(tText("Public holidays could not be synchronized. Please retry."));
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
  const visibleMonthKey = visibleMonth.toISOString().slice(0, 7);
  const visibleMonthHolidays = (data ?? []).filter(({ holidayDate }) => holidayDate.startsWith(visibleMonthKey));
  const importedThisMonth = visibleMonthHolidays.filter(({ source }) => source === "PUBLIC_DATA").length;
  const manuallyAddedThisMonth = visibleMonthHolidays.length - importedThisMonth;
  const nextOutsideVisibleMonth = upcoming.find(({ holidayDate }) => !holidayDate.startsWith(visibleMonthKey));
  const missingRegionOffices = offices.filter(({ countryCode }) => !countryCode);
  function showHoliday(holiday: Holiday) {
    setVisibleMonth(monthStart(holiday.holidayDate));
    openEdit(holiday);
  }
  return (
    <AdminPage
      title={tText("Holiday Calendar")}
      description={tText(
        "Public holidays follow each office region. HR can add or override tenant-wide and office-specific dates.",
      )}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-[#151515] disabled:opacity-50"
            disabled={syncing}
            onClick={syncPublicHolidays}
            type="button"
          >
            <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? tText("Syncing…") : tText("Sync public holidays")}
          </button>
          <PrimaryButton onClick={openCreate}>
            <Plus className="size-4" />
            {tText("Add holiday")}
          </PrimaryButton>
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {syncMessage && (
        <div className="mb-5 rounded-xl border border-[#beb8ad] bg-[#f3efe6] p-4 text-sm font-medium text-[#151515]">
          {syncMessage}
        </div>
      )}
      {missingRegionOffices.length > 0 && syncing && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#beb8ad] bg-[#f3efe6] p-4 text-sm text-[#151515]">
          <RefreshCw className="size-5 shrink-0 animate-spin" />
          {tText("Detecting each office country from its saved location and importing public holidays…")}
        </div>
      )}
      {missingRegionOffices.length > 0 && !syncing && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <Globe2 className="size-5 shrink-0" />
          <p>
            {tText("We could not detect the country from the saved location for")}{" "}
            {missingRegionOffices.map(({ officeName }) => officeName).join(", ")}
            {tText(". Check that each office pin is in the correct place, then retry.")}
          </p>
          <Link
            className="ml-auto font-semibold text-amber-950 underline underline-offset-4"
            href="/app/attendance/offices"
          >
            {tText("Check office pins")}
          </Link>
        </div>
      )}
      {!data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Panel className="overflow-hidden border-zinc-200 shadow-sm">
            <div className="border-b border-surface-variant bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <button
                  aria-label={tText("Previous month")}
                  className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:-translate-x-0.5 hover:border-[#beb8ad] hover:text-[#151515]"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() - 1, 1)),
                    )
                  }
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#151515]">
                    {tText("Holiday schedule")}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-zinc-950">{monthLabel}</h2>
                  <p className="mt-1 text-xs text-outline">
                    {visibleMonthHolidays.length}{" "}
                    {visibleMonthHolidays.length === 1 ? tText("holiday") : tText("holidays")} {tText("across")}
                    {offices.length} {offices.length === 1 ? tText("office") : tText("offices")}
                  </p>
                </div>
                <button
                  aria-label={tText("Next month")}
                  className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:translate-x-0.5 hover:border-[#beb8ad] hover:text-[#151515]"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 1)),
                    )
                  }
                  type="button"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-[#ede7dc] px-3 py-1 text-xs font-semibold text-[#151515]">
                  {importedThisMonth} {tText("public")}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {manuallyAddedThisMonth} {tText("HR added")}
                </span>
                <button
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-[#beb8ad] hover:text-[#151515]"
                  onClick={() =>
                    setVisibleMonth(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)))
                  }
                  type="button"
                >
                  {tText("Today")}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto p-4 sm:p-5">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-outline">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {days.map(({ date, day, inMonth, isWeekend }) => {
                    const holidays = holidaysByDate.get(date) ?? [];
                    const isToday = date === today;
                    return (
                      <div
                        key={date}
                        className={`group relative min-h-28 overflow-hidden rounded-xl border p-2.5 transition ${
                          !inMonth
                            ? "border-transparent bg-zinc-50/50 text-zinc-400"
                            : holidays.length
                              ? "border-[#beb8ad] bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-[0_8px_24px_-18px_rgba(37,99,235,0.8)] ring-1 ring-[#beb8ad]"
                              : isWeekend
                                ? "border-zinc-200 bg-zinc-50/70"
                                : "border-surface-variant bg-white hover:border-zinc-300 hover:shadow-sm"
                        }`}
                      >
                        {holidays.length > 0 && (
                          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />
                        )}
                        <span
                          className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                            isToday
                              ? "bg-zinc-950 text-white"
                              : holidays.length
                                ? "bg-[#151515] text-white"
                                : "text-zinc-700"
                          }`}
                        >
                          {day}
                        </span>
                        {holidays.slice(0, 2).map((holiday) => (
                          <button
                            key={holiday.id}
                            className={`mt-2 block w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-bold leading-4 transition hover:-translate-y-0.5 ${
                              holiday.source === "PUBLIC_DATA"
                                ? "bg-[#151515] text-white shadow-sm"
                                : "bg-amber-100 text-amber-950 ring-1 ring-amber-200"
                            }`}
                            onClick={() => showHoliday(holiday)}
                            title={`${holiday.holidayName} · ${holiday.office?.officeName ?? "All offices"}`}
                            type="button"
                          >
                            {holiday.holidayName}
                          </button>
                        ))}
                        {holidays.length > 2 && (
                          <span className="mt-1 block text-[10px] font-semibold text-[#151515]">
                            +{holidays.length - 2} {tText("more")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!visibleMonthHolidays.length && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    <span>
                      {tText("No holidays are scheduled in")}
                      {monthLabel}.
                    </span>
                    {nextOutsideVisibleMonth && (
                      <button
                        className="font-semibold text-[#151515] hover:underline"
                        onClick={() => setVisibleMonth(monthStart(nextOutsideVisibleMonth.holidayDate))}
                        type="button"
                      >
                        {tText("Go to")}
                        {nextOutsideVisibleMonth.holidayName}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Panel>
          <Panel className="h-fit overflow-hidden border-zinc-200 p-0 shadow-sm xl:sticky xl:top-6">
            <div className="bg-zinc-950 px-5 py-5 text-white">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-cyan-300" />
                <h2 className="font-semibold">{tText("Upcoming holidays")}</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-400">{tText("Select a holiday to open its month and details.")}</p>
            </div>
            <div className="grid gap-2 p-4">
              {upcoming.map((holiday) => (
                <button
                  key={holiday.id}
                  className="group flex items-center gap-3 rounded-xl border border-transparent bg-zinc-50 p-3 text-left transition hover:border-[#beb8ad] hover:bg-[#f3efe6]"
                  onClick={() => showHoliday(holiday)}
                  type="button"
                >
                  <span className="grid w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white text-center shadow-sm">
                    <span className="bg-[#151515] py-0.5 text-[9px] font-bold uppercase text-white">
                      {new Date(holiday.holidayDate).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}
                    </span>
                    <span className="py-1 text-lg font-black text-zinc-900">
                      {new Date(holiday.holidayDate).getUTCDate()}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{holiday.holidayName}</span>
                    <span className="mt-0.5 block text-xs text-outline">
                      {holiday.office?.officeName ?? tText("All offices")}
                    </span>
                    <span
                      className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        holiday.source === "PUBLIC_DATA" ? "bg-[#ede7dc] text-[#151515]" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {holiday.source === "PUBLIC_DATA" ? tText("Public holiday") : tText("HR added")}
                    </span>
                  </span>
                </button>
              ))}
              {!upcoming.length && (
                <p className="rounded-lg bg-zinc-50 p-4 text-sm text-outline">
                  {tText("No upcoming holidays. Sync a public calendar or add one manually.")}
                </p>
              )}
            </div>
            <p className="border-t border-surface-variant px-5 py-4 text-[10px] leading-5 text-outline">
              {tText("Public data comes from the")}{" "}
              <a
                className="underline"
                href="https://gov.om/en/important-dates-and-holidays?entity=400196"
                rel="noreferrer"
                target="_blank"
              >
                {tText("Oman Ministry of Labour")}
              </a>{" "}
              {tText("for Oman, the")}{" "}
              <a
                className="underline"
                href="https://github.com/commenthol/date-holidays"
                rel="noreferrer"
                target="_blank"
              >
                {tText("date-holidays open dataset")}
              </a>{" "}
              {tText("where supported, or the keyless")}{" "}
              <a className="underline" href="https://tallyfy.com/national-holidays/" rel="noreferrer" target="_blank">
                {tText("Tallyfy fallback")}
              </a>
              {tText(". HR edits always take precedence.")}
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
            <Field label={tText("Holiday name")}>
              <input
                className={inputClass}
                value={form.holidayName}
                onChange={(e) => setForm({ ...form, holidayName: e.target.value })}
              />
            </Field>
            <Field label={tText("Date")}>
              <input
                type="date"
                className={inputClass}
                value={form.holidayDate}
                onChange={(e) => setForm({ ...form, holidayDate: e.target.value })}
              />
            </Field>
            <Field label={tText("Scope")}>
              <select
                className={inputClass}
                value={form.officeLocationId}
                onChange={(e) => setForm({ ...form, officeLocationId: e.target.value })}
              >
                <option value="">{tText("All offices")}</option>
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
                  {tText("Delete")}
                </button>
              )}
              <PrimaryButton className="flex-1" onClick={saveHoliday}>
                {tText("Publish holiday")}
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
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
    };
  });
}

function monthStart(date: string) {
  const [year, month] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
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
  const { tText } = useTenantLocalization();
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [detectingRegion, setDetectingRegion] = useState(false);
  const skipSuggestionFetch = useRef(false);
  const suggestionListId = useId();
  const coordinate = validCoordinate(latitude, longitude);

  useEffect(() => {
    const query = searchQuery.trim();
    if (skipSuggestionFetch.current) {
      skipSuggestionFetch.current = false;
      return;
    }
    if (query.length < 3) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      setSuggestionError("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionError("");
      try {
        const response = await apiClient.get<LocationSuggestion[] | { data: LocationSuggestion[] }>(
          "/offices/location-suggestions",
          {
            params: { q: query, limit: 6 },
            signal: controller.signal,
          },
        );
        const results = Array.isArray(response.data) ? response.data : response.data.data;
        setSuggestions(results ?? []);
        setSuggestionsOpen(true);
        setActiveSuggestion(-1);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setSuggestions([]);
          setSuggestionsOpen(true);
          setSuggestionError(tText("Search failed. Please try again."));
        }
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  async function selectCoordinate(nextCoordinate: MapCoordinate) {
    setDetectingRegion(true);
    const region = await reverseGeocodeRegion(nextCoordinate).catch(() => undefined);
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
        alert(tText("Location not found"));
      }
    } catch (err) {
      console.error(err);
      alert(tText("Search failed. Please try again."));
    } finally {
      setSearching(false);
    }
  }

  function selectSuggestion(place: LocationSuggestion) {
    skipSuggestionFetch.current = true;
    setSearchQuery(locationSuggestionLabel(place));
    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    onChange(
      { latitude: place.latitude, longitude: place.longitude },
      place.countryCode ? { countryCode: place.countryCode } : undefined,
    );
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || suggestions.length === 0) {
      if (event.key === "Escape") setSuggestionsOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    }
  }

  const marker = coordinate ? [{ id: "office", label: tText("Office pin"), ...coordinate }] : [];
  const geofence = coordinate
    ? [
        {
          id: "office",
          label: tText("Attendance boundary"),
          ...coordinate,
          radiusMeters: Number(radiusMeters) || 150,
        },
      ]
    : [];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{tText("Pin the office entrance")}</div>
          <div className="text-xs text-outline">
            {tText(
              "Search for a location, click the map, or use your current location. The circle is the valid attendance area.",
            )}
          </div>
        </div>
        <button
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-outline-variant bg-white px-3 text-sm font-semibold text-[#151515] transition-colors hover:bg-stone-50"
          disabled={locating}
          onClick={useCurrentLocation}
          type="button"
        >
          <Crosshair className="size-4" />
          {locating || detectingRegion ? tText("Locating…") : tText("Use current location")}
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="size-4 text-outline" />
          </div>
          <input
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={suggestionListId}
            aria-expanded={suggestionsOpen}
            aria-activedescendant={activeSuggestion >= 0 ? `${suggestionListId}-${activeSuggestion}` : undefined}
            className="block w-full rounded-xl border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm focus:border-[#151515] focus:outline-none focus:ring-1 focus:ring-[#151515]"
            placeholder={tText("Search for a location (e.g., city, street, landmark)...")}
            value={searchQuery}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setSearchQuery(nextQuery);
              setSuggestionError("");
              setSuggestionsOpen(nextQuery.trim().length >= 3);
              if (nextQuery.trim().length < 3) {
                setSuggestions([]);
                setSuggestionsLoading(false);
              }
              setActiveSuggestion(-1);
            }}
            onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
            onKeyDown={handleSearchKeyDown}
          />
          {suggestionsLoading && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-outline">
              {tText("Searching...")}
            </span>
          )}
          {suggestionsOpen && (suggestions.length > 0 || suggestionError) && (
            <div
              id={suggestionListId}
              role="listbox"
              className="absolute z-[1000] mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-outline-variant bg-white p-1.5 shadow-xl"
            >
              {suggestionError && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                  {suggestionError}
                </div>
              )}
              {suggestions.map((place, index) => {
                const title = locationSuggestionTitle(place);
                const detail = locationSuggestionDetail(place);
                return (
                  <button
                    id={`${suggestionListId}-${index}`}
                    key={place.id}
                    type="button"
                    role="option"
                    aria-selected={activeSuggestion === index}
                    className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      activeSuggestion === index ? "bg-[#f3efe6]" : "hover:bg-stone-50"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => selectSuggestion(place)}
                  >
                    <span className="block truncate text-sm font-semibold text-on-surface">{title}</span>
                    {detail && <span className="mt-0.5 block truncate text-xs text-outline">{detail}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          className="rounded-xl bg-[#151515] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {searching ? tText("Searching...") : tText("Search")}
        </button>
      </form>

      <FieldMap
        className="min-h-[280px]"
        geofences={geofence}
        markers={marker}
        onMapClick={(nextCoordinate) => void selectCoordinate(nextCoordinate)}
      />
      {!coordinate && (
        <p className="text-xs font-semibold text-amber-700">{tText("No office location selected yet.")}</p>
      )}
    </div>
  );
}

type NominatimPlace = {
  lat: string;
  lon: string;
  address?: Record<string, string | undefined>;
};

type LocationSuggestion = {
  id: string;
  latitude: number;
  longitude: number;
  name?: string | null;
  houseNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  countryCode?: string | null;
};

function locationSuggestionTitle(place: LocationSuggestion) {
  return (
    place.name ||
    [place.houseNumber, place.street].filter(Boolean).join(" ") ||
    place.city ||
    place.state ||
    place.country ||
    "Location"
  );
}

function locationSuggestionDetail(place: LocationSuggestion) {
  const title = locationSuggestionTitle(place);
  return Array.from(
    new Set(
      [place.street, place.district, place.city, place.county, place.state, place.postcode, place.country].filter(
        Boolean,
      ),
    ),
  )
    .filter((part) => part !== title)
    .join(", ");
}

function locationSuggestionLabel(place: LocationSuggestion) {
  return [locationSuggestionTitle(place), locationSuggestionDetail(place)].filter(Boolean).join(", ");
}

async function reverseGeocodeRegion(coordinate: MapCoordinate) {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    lat: String(coordinate.latitude),
    lon: String(coordinate.longitude),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
  if (!response.ok) return undefined;
  return regionFromPlace((await response.json()) as NominatimPlace);
}

function regionFromPlace(place: NominatimPlace): OfficeRegion | undefined {
  const countryCode = place.address?.country_code?.toUpperCase();
  if (!countryCode) return undefined;
  const subdivisionCode = Object.entries(place.address ?? {}).find(
    ([key, value]) => key.startsWith("ISO3166-2") && typeof value === "string" && value.startsWith(`${countryCode}-`),
  )?.[1];
  return { countryCode, subdivisionCode };
}

function validCoordinate(latitude: string | number, longitude: string | number) {
  if (String(latitude).trim() === "" || String(longitude).trim() === "") {
    return null;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

function timezoneForCoordinate(latitude: string | number, longitude: string | number) {
  const coordinate = validCoordinate(latitude, longitude);
  if (!coordinate) return null;
  try {
    return timezoneLookup(coordinate.latitude, coordinate.longitude);
  } catch {
    return null;
  }
}

const policyDurationHours = Array.from({ length: 25 }, (_, index) => index);
const policyDurationMinutes = Array.from({ length: 60 }, (_, index) => index);

function DurationField({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { tText } = useTenantLocalization();
  const normalizedValue = Number.isFinite(value) ? Math.min(1_440, Math.max(0, Math.round(value))) : 0;
  const hours = Math.floor(normalizedValue / 60);
  const minutes = normalizedValue % 60;
  const descriptionId = `${id}-description`;

  return (
    <fieldset className="rounded-xl border border-surface-variant bg-zinc-50/60 p-4">
      <legend className="px-1 text-sm font-semibold text-on-surface">{label}</legend>
      <p className="mb-3 min-h-10 text-xs leading-5 text-outline" id={descriptionId}>
        {description}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-xs font-semibold text-on-surface-variant">
          {tText("Hours")}
          <select
            aria-describedby={descriptionId}
            className={inputClass}
            id={`${id}-hours`}
            onChange={(event) => {
              const nextHours = Number(event.target.value);
              onChange(nextHours === 24 ? 1_440 : nextHours * 60 + minutes);
            }}
            value={hours}
          >
            {policyDurationHours.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-on-surface-variant">
          {tText("Minutes")}
          <select
            aria-describedby={descriptionId}
            className={inputClass}
            disabled={hours === 24}
            id={`${id}-minutes`}
            onChange={(event) => onChange(hours * 60 + Number(event.target.value))}
            value={minutes}
          >
            {policyDurationMinutes.map((minute) => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#151515]">{formatPolicyDuration(normalizedValue)}</p>
    </fieldset>
  );
}

function PolicyToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-28 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked ? "border-[#151515] bg-[#f3efe6]" : "border-surface-variant bg-white hover:bg-zinc-50"
      }`}
    >
      <input
        checked={checked}
        className="mt-1 size-4 accent-primary"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-semibold text-on-surface">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-outline">{description}</span>
      </span>
    </label>
  );
}

function validatePolicyRuleForm(form: {
  name: string;
  lateAfterMinutes: number;
  halfDayAfterMinutes: number;
  minimumWorkMinutes: number;
  overtimeAfterMinutes: number;
  maxOfflineSyncHours: number;
  maxFaceAttempts: number;
}) {
  if (form.name.trim().length < 2 || form.name.trim().length > 100) {
    return "Policy name must contain between 2 and 100 characters.";
  }

  const durations = [
    form.lateAfterMinutes,
    form.halfDayAfterMinutes,
    form.minimumWorkMinutes,
    form.overtimeAfterMinutes,
  ];
  if (durations.some((duration) => !Number.isInteger(duration) || duration < 0 || duration > 1_440)) {
    return "Attendance durations must be between 0 and 24 hours.";
  }
  if (form.lateAfterMinutes > form.halfDayAfterMinutes) {
    return "The late grace period cannot be longer than the half-day threshold.";
  }
  if (form.minimumWorkMinutes > form.overtimeAfterMinutes) {
    return "Minimum full-day work cannot be longer than the overtime threshold.";
  }
  if (!Number.isInteger(form.maxOfflineSyncHours) || form.maxOfflineSyncHours < 0 || form.maxOfflineSyncHours > 168) {
    return "Offline sync delay must be between 0 and 168 hours.";
  }
  if (!Number.isInteger(form.maxFaceAttempts) || form.maxFaceAttempts < 1 || form.maxFaceAttempts > 10) {
    return "Maximum face attempts must be between 1 and 10.";
  }
  return "";
}

function formatPolicyDuration(totalMinutes: number) {
  const normalizedMinutes = Number.isFinite(totalMinutes) ? Math.max(0, Math.round(totalMinutes)) : 0;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function Dialog({
  title,
  onClose,
  children,
  wide = false,
  error,
  inline = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  error?: string;
  inline?: boolean;
}) {
  const { tText } = useTenantLocalization();
  useEffect(() => {
    if (inline) return;
    clearStaleScrollLock();
    return clearStaleScrollLock;
  }, [inline]);
  const panel = (
    <div
      data-testid="dialog-panel"
      className={
        inline
          ? "w-full rounded-2xl border border-surface-variant bg-zinc-50/50 p-5 lg:p-7"
          : `${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-7 shadow-2xl`
      }
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {!inline && (
          <button onClick={onClose} className="text-outline">
            {tText("Close")}
          </button>
        )}
      </div>
      {error && (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      )}
      {children}
    </div>
  );
  if (inline) return panel;
  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-zinc-900/45 p-4"
      role="dialog"
    >
      {panel}
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
          details?: Array<{ field?: string; messages?: string[] }> | Record<string, unknown>;
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
function policyCoverage(assignments: PolicyAssignment[], employees: Employee[]) {
  if (assignments.some(({ scope }) => scope === "TENANT_DEFAULT")) return employees.length;
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
function assignmentLabel(assignment: PolicyAssignment, departments: Department[], employees: Employee[]) {
  if (assignment.scope === "TENANT_DEFAULT") return "Tenant default";
  if (assignment.scope === "DEPARTMENT")
    return `Department · ${departments.find(({ id }) => id === assignment.deptId)?.name ?? "Unknown"}`;
  return `Employee · ${employees.find(({ id }) => id === assignment.employeeId)?.fullName ?? "Unknown"}`;
}
function dateRange(start: Date, end: Date) {
  const result: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 86_400_000))
    result.push(cursor);
  return result;
}
function isWeeklyOffDate(value: unknown, date: Date) {
  if (!Array.isArray(value)) return false;
  const weekday = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()];
  const occurrence = Math.ceil(date.getDate() / 7);
  return value.some((entry) => {
    if (entry === weekday) return true;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const rule = entry as { weekday?: unknown; occurrences?: unknown };
    return (
      rule.weekday === weekday &&
      (rule.occurrences === undefined || (Array.isArray(rule.occurrences) && rule.occurrences.includes(occurrence)))
    );
  });
}
async function uploadRoster(file: File, setError: (message: string) => void, reload: () => void) {
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
    setError(tenantMessage("Roster CSV could not be uploaded or processed."));
  }
}
