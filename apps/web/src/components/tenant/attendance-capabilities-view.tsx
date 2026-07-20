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
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AttendanceHelpKey } from "@/content/attendance-help";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { AdminPage, ErrorState, LoadingState, Panel } from "./page-primitives";
import { FeatureInfo } from "@/components/help/feature-info";

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
      setError("Attendance capabilities could not be loaded.");
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
      .catch(() => setError("Attendance capabilities could not be loaded."));
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
      title="Employee app behavior"
      description="Control the tenant-wide capability boundary. Policy assignments decide the exact behavior for each employee."
      action={
        <Button
          className="h-11 bg-primary px-5 text-white hover:bg-primary/90"
          disabled={
            !canManage || saving || !capabilities?.fieldTrackingEntitled
          }
          onClick={save}
        >
          {saving ? "Saving..." : "Save capabilities"}
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
              label="Attendance module"
              detail="Workspace entitlement status reported by the DeltCRM platform."
            />
            <StatusCard
              enabled={assignedPolicies.some(
                ({ locationMode }) => locationMode !== "NONE",
              )}
              helpKey="location-verification"
              icon={MapPin}
              label="Location verification"
              detail="Applied only by the employee's effective policy."
            />
            {capabilities.biometricEnforcementAvailable && (
              <StatusCard
                enabled={assignedPolicies.some(
                  ({ selfieMode }) => selfieMode === "REQUIRED",
                )}
                helpKey="selfie-verification"
                icon={Fingerprint}
                label="Selfie verification"
                detail="Provider gate is available for policies that require a selfie."
              />
            )}
            <StatusCard
              enabled={assignedPolicies.some(
                ({ requireRegisteredDevice }) => requireRegisteredDevice,
              )}
              helpKey="devices"
              icon={ShieldCheck}
              label="Registered devices"
              detail="Device and integrity checks remain independent from selfie rules."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Panel className="p-7">
              <div className="flex items-start gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-zinc-100 text-primary">
                  <Radar className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      Field tracking boundary
                    </h2>
                    <FeatureInfo helpKey="background-tracking" />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Turning this off ends active field sessions and rejects new
                    tracking requests. Eligible employee policies still need to
                    enable field tracking individually.
                  </p>
                </div>
              </div>
              {!capabilities.fieldTrackingEntitled ? (
                <div className="mt-6 flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <LockKeyhole className="mt-0.5 size-5 shrink-0 text-zinc-500" />
                  <div>
                    <p className="text-sm font-bold">
                      Not included for this workspace
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {canManageSubscription
                        ? "Review the workspace subscription with the DeltCRM platform owner before enabling tracked field work."
                        : "Field Tracking is unavailable for this workspace. Office and non-tracked attendance continue normally."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_180px]">
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-surface-variant p-4">
                    <span>
                      <span className="block text-sm font-bold">
                        Allow field tracking
                      </span>
                      <span className="mt-1 block text-xs text-outline">
                        Effective only for FIELD and explicitly allowed HYBRID
                        employees.
                      </span>
                    </span>
                    <input
                      aria-label="Allow field tracking"
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
                    Tracking interval
                    <Input
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
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4" />
                  Runtime configuration updated.
                </p>
              )}
            </Panel>

            <Panel className="p-7">
              <h2 className="text-lg font-bold">Employee policy impact</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Department and employee assignments override the tenant default.
                The mobile app receives only the final effective behavior.
              </p>
              <dl className="mt-5 space-y-3 text-sm">
                <Impact
                  label="Assigned policies"
                  value={String(assignedPolicies.length)}
                />
                <Impact
                  label="Location-only supported"
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
                  label="Configuration version"
                  value={String(capabilities.runtimeConfigVersion)}
                />
              </dl>
              <Link
                className="mt-6 flex h-9 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium transition hover:bg-zinc-50"
                href="/app/attendance/policies"
              >
                Manage employee policies
              </Link>
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
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-zinc-50 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="flex items-center gap-1">
          {helpKey && (
            <FeatureInfo className="min-h-9 min-w-9" helpKey={helpKey} />
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${enabled ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-on-surface-variant"}`}
          >
            {enabled ? "Enabled" : "Off"}
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
    <div className="flex items-center justify-between gap-4 rounded-lg bg-zinc-50 px-4 py-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-bold text-zinc-700">{value}</dd>
    </div>
  );
}
