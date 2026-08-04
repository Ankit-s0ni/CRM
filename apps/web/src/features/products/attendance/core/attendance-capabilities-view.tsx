"use client";

import {
  CheckCircle2,
  Fingerprint,
  LockKeyhole,
  MapPin,
  Radar,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { AttendanceHelpKey } from "@/content/attendance-help";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { AdminPage, ErrorState, LoadingState, Panel } from "@/shared/components/page-primitives";
import { FeatureInfo } from "@/features/platform/help/feature-info";
import { useTenantLocalization } from "@/lib/tenant-localization";

type Capabilities = {
  attendanceEntitled: boolean;
  fieldTrackingEntitled: boolean;
  fieldTrackingEnabled: boolean;
  fieldTrackingIntervalMin: number;
  biometricEnforcementAvailable: boolean;
  runtimeConfigVersion: number;
};

type Policy = {
  id: string;
  name: string;
  locationMode: "NONE" | "OFFICE_GEOFENCE" | "FIELD_GPS";
  selfieMode: "DISABLED" | "REQUIRED";
  requireRegisteredDevice: boolean;
  fieldTrackingEnabled: boolean;
  allowHybridFieldTracking: boolean;
  assignments: unknown[];
};

export function AttendanceCapabilitiesView() {
  const { tText } = useTenantLocalization();
  const permissions = new Set(
    useAuthStore((state) => state.user?.permissions ?? []),
  );
  const canManage = permissions.has("attendance.config.manage");
  const canManageSubscription = permissions.has("billing.subscription.manage");
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [fieldEnabled, setFieldEnabled] = useState(false);
  const [interval, setInterval] = useState(15);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [capabilityResponse, policyResponse] = await Promise.all([
        apiClient.get<{ data: Capabilities }>(
          "/workspace/attendance-capabilities",
        ),
        apiClient.get<{ data: Policy[] }>("/attendance-policies"),
      ]);
      const next = capabilityResponse.data.data;
      setCapabilities(next);
      setFieldEnabled(next.fieldTrackingEnabled);
      setInterval(next.fieldTrackingIntervalMin);
      setPolicies(policyResponse.data.data);
    } catch {
      setError(tText("Attendance capabilities could not be loaded."));
    }
  }

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: Capabilities }>(
        "/workspace/attendance-capabilities",
      ),
      apiClient.get<{ data: Policy[] }>("/attendance-policies"),
    ])
      .then(([capabilityResponse, policyResponse]) => {
        const next = capabilityResponse.data.data;
        setCapabilities(next);
        setFieldEnabled(next.fieldTrackingEnabled);
        setInterval(next.fieldTrackingIntervalMin);
        setPolicies(policyResponse.data.data);
      })
      .catch(() => setError(tText("Attendance capabilities could not be loaded.")));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await apiClient.patch("/workspace/attendance-capabilities", {
        fieldTrackingEnabled: fieldEnabled,
        fieldTrackingIntervalMin: interval,
      });
      await load();
      setSaved(true);
    } catch (requestError: unknown) {
      const response = requestError as {
        response?: { data?: { message?: string } };
      };
      setError(
        response.response?.data?.message ??
          "Attendance capabilities could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  const assignedPolicies = policies.filter(
    ({ assignments }) => assignments.length,
  );
  return (
    <AdminPage
      title={tText("Employee app behavior")}
      description={tText("Control the tenant-wide capability boundary. Policy assignments decide the exact behavior for each employee.")}
      action={
        <Button
          className="h-11 bg-primary px-5 text-on-tone hover:bg-primary-container"
          disabled={
            !canManage || saving || !capabilities?.fieldTrackingEntitled
          }
          onClick={save}
        >
          {saving ? tText("Saving...") : tText("Save capabilities")}
        </Button>
      }
    >
      {error && <ErrorState message={error} />}
      {!capabilities ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              enabled={capabilities.attendanceEntitled}
              icon={Smartphone}
              label={tText("Attendance module")}
              detail="Workspace entitlement status reported by the DeltCRM platform."
            />
            <StatusCard
              enabled={assignedPolicies.some(
                ({ locationMode }) => locationMode !== "NONE",
              )}
              helpKey="location-verification"
              icon={MapPin}
              label={tText("Location verification")}
              detail="Applied only by the employee's effective policy."
            />
            {capabilities.biometricEnforcementAvailable && (
              <StatusCard
                enabled={assignedPolicies.some(
                  ({ selfieMode }) => selfieMode === "REQUIRED",
                )}
                helpKey="selfie-verification"
                icon={Fingerprint}
                label={tText("Selfie verification")}
                detail="Provider gate is available for policies that require a selfie."
              />
            )}
            <StatusCard
              enabled={assignedPolicies.some(
                ({ requireRegisteredDevice }) => requireRegisteredDevice,
              )}
              helpKey="devices"
              icon={ShieldCheck}
              label={tText("Registered devices")}
              detail="Device and integrity checks remain independent from selfie rules."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Panel className="p-7">
              <div className="flex items-start gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-muted text-foreground">
                  <Radar className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      {tText("Field tracking boundary")}</h2>
                    <FeatureInfo helpKey="background-tracking" />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {tText("Turning this off ends active field sessions and rejects new tracking requests. Eligible employee policies still need to enable field tracking individually.")}</p>
                </div>
              </div>
              {!capabilities.fieldTrackingEntitled ? (
                <div className="mt-6 flex gap-3 rounded-xl border border-border bg-muted p-4">
                  <LockKeyhole className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold">
                      {tText("Not included for this workspace")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {canManageSubscription
                        ? tText("Review the workspace subscription with the DeltCRM platform owner before enabling tracked field work.")
                        : tText("Field Tracking is unavailable for this workspace. Office and non-tracked attendance continue normally.")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_180px]">
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-surface-variant p-4">
                    <span>
                      <span className="block text-sm font-bold">
                        {tText("Allow field tracking")}</span>
                      <span className="mt-1 block text-xs text-outline">
                        {tText("Effective only for FIELD and explicitly allowed HYBRID employees.")}</span>
                    </span>
                    <input
                      aria-label={tText("Allow field tracking")}
                      checked={fieldEnabled}
                      className="size-5 accent-primary"
                      disabled={!canManage}
                      onChange={(event) =>
                        setFieldEnabled(event.target.checked)
                      }
                      type="checkbox"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    {tText("Tracking interval")}<Input
                      className="mt-2 h-11"
                      disabled={!canManage || !fieldEnabled}
                      max={120}
                      min={1}
                      onChange={(event) =>
                        setInterval(Number(event.target.value))
                      }
                      type="number"
                      value={interval}
                    />
                  </label>
                </div>
              )}
              {saved && (
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold theme-tone-text theme-tone-emerald">
                  <CheckCircle2 className="size-4" />
                  {tText("Runtime configuration updated.")}</p>
              )}
            </Panel>

            <Panel className="p-7">
              <h2 className="text-lg font-bold">{tText("Employee policy impact")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {tText("Department and employee assignments override the tenant default. The mobile app receives only the final effective behavior.")}</p>
              <dl className="mt-5 space-y-3 text-sm">
                <Impact
                  label={tText("Assigned policies")}
                  value={String(assignedPolicies.length)}
                />
                <Impact
                  label={tText("Location-only supported")}
                  value={
                    assignedPolicies.some(
                      (policy) =>
                        policy.locationMode !== "NONE" &&
                        policy.selfieMode === "DISABLED",
                    )
                      ? "Yes"
                      : "Not configured"
                  }
                />
                <Impact
                  label={tText("Configuration version")}
                  value={String(capabilities.runtimeConfigVersion)}
                />
              </dl>
              <Link
                className="mt-6 flex h-9 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted"
                href="/app/attendance/policies"
              >
                {tText("Manage employee policies")}</Link>
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function StatusCard({
  enabled,
  icon: Icon,
  label,
  detail,
  helpKey,
}: {
  enabled: boolean;
  icon: typeof Smartphone;
  label: string;
  detail: string;
  helpKey?: AttendanceHelpKey;
}) {
  const { tText } = useTenantLocalization();
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
          <Icon className="size-5" />
        </span>
        <div className="flex items-center gap-1">
          {helpKey && (
            <FeatureInfo className="min-h-9 min-w-9" helpKey={helpKey} />
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${enabled ? "status-badge status-enabled" : "bg-muted text-on-surface-variant"}`}
          >
            {enabled ? tText("Enabled") : tText("Off")}
          </span>
        </div>
      </div>
      <h2 className="mt-4 font-bold">{label}</h2>
      <p className="mt-1 text-xs leading-5 text-outline">{detail}</p>
    </Panel>
  );
}

function Impact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-bold text-foreground">{value}</dd>
    </div>
  );
}
