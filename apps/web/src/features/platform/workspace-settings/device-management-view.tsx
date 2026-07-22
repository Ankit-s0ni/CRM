"use client";

import {
  CheckCircle2,
  Laptop,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { FeatureInfo } from "@/features/platform/help/feature-info";
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

type DeviceStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "BLOCKED"
  | "REPLACED";

export type ManagedDevice = {
  id: string;
  employeeId: string;
  deviceUuid: string;
  platform: "ANDROID" | "IOS";
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  status: DeviceStatus;
  isPrimary: boolean;
  replacedByDeviceId: string | null;
  registeredAt: string;
  lastSeenAt: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
  };
};

type Decision =
  | { action: "approve" | "block"; device: ManagedDevice }
  | { action: "replace"; device: ManagedDevice; candidates: ManagedDevice[] };

const filters: Array<{ label: string; value: DeviceStatus | "ALL" }> = [
  { label: "All devices", value: "ALL" },
  { label: "Pending approval", value: "PENDING_APPROVAL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Blocked", value: "BLOCKED" },
  { label: "Replaced", value: "REPLACED" },
];

export function DeviceManagementView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [devices, setDevices] = useState<ManagedDevice[] | null>(null);
  const filter = deviceFilter(searchParams.get("status"));
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);

  async function loadDevices() {
    setError("");
    try {
      const response = await apiClient.get("/devices?limit=100");
      setDevices(response.data.data);
    } catch {
      setError("Registered devices could not be loaded.");
    }
  }

  useEffect(() => {
    let active = true;
    apiClient
      .get("/devices?limit=100")
      .then((response) => {
        if (active) setDevices(response.data.data);
      })
      .catch(() => {
        if (active) setError("Registered devices could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const visible =
    devices?.filter((device) => filter === "ALL" || device.status === filter) ??
    [];

  return (
    <AdminPage
      title="Employee devices"
      description="Review registrations and control which devices can submit trusted attendance."
      action={
        <PrimaryButton onClick={() => void loadDevices()}>
          <RefreshCw className="size-4" /> Refresh
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending review"
          value={count(devices, "PENDING_APPROVAL")}
          tone="warning"
        />
        <MetricCard label="Active" value={count(devices, "ACTIVE")} tone="success" />
        <MetricCard label="Blocked" value={count(devices, "BLOCKED")} tone="danger" />
        <MetricCard label="Total registrations" value={devices?.length ?? 0} />
      </div>
      <div className="mb-5 flex flex-wrap gap-2" aria-label="Device status filters">
        {filters.map((item) => (
          <button
            aria-pressed={filter === item.value}
            key={item.value}
            type="button"
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${
              filter === item.value
                ? "border-primary bg-primary text-white"
                : "border-zinc-300 bg-white text-on-surface-variant hover:border-primary"
            }`}
          onClick={() =>
            router.push(
              `${pathname}${item.value === "ALL" ? "" : `?status=${item.value}`}`,
              { scroll: false },
            )
          }
          >
            {item.label}
          </button>
        ))}
      </div>
      {!devices ? (
        <LoadingState />
      ) : visible.length ? (
        <DeviceTable
          devices={visible}
          allDevices={devices}
          onDecision={setDecision}
          showEmployee
        />
      ) : (
        <Panel>
          <EmptyState
            title="No devices in this state"
            body="New mobile registrations will appear here immediately for review."
          />
        </Panel>
      )}
      {decision && (
        <DeviceDecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onComplete={async () => {
            setDecision(null);
            await loadDevices();
          }}
        />
      )}
    </AdminPage>
  );
}

export function EmployeeDevicePanel({ employeeId }: { employeeId: string }) {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canManage = permissions.includes("attendance.devices.manage");
  const [devices, setDevices] = useState<ManagedDevice[] | null>(null);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);

  async function loadDevices() {
    setError("");
    try {
      const response = await apiClient.get(
        `/devices?employeeId=${encodeURIComponent(employeeId)}&limit=100`,
      );
      setDevices(response.data.data);
    } catch {
      setError("Employee devices could not be loaded.");
    }
  }

  useEffect(() => {
    let active = true;
    apiClient
      .get(`/devices?employeeId=${encodeURIComponent(employeeId)}&limit=100`)
      .then((response) => {
        if (active) setDevices(response.data.data);
      })
      .catch(() => {
        if (active) setError("Employee devices could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [employeeId]);

  return (
    <>
      {error && <ErrorState message={error} />}
      {!devices ? (
        <LoadingState />
      ) : devices.length ? (
        <DeviceTable
          devices={devices}
          allDevices={devices}
          onDecision={canManage ? setDecision : undefined}
        />
      ) : (
        <EmptyState
          title="No registered device"
          body="The employee’s first mobile registration will appear here for approval."
        />
      )}
      {decision && (
        <DeviceDecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onComplete={async () => {
            setDecision(null);
            await loadDevices();
          }}
        />
      )}
    </>
  );
}

function DeviceTable({
  devices,
  allDevices,
  onDecision,
  showEmployee = false,
}: {
  devices: ManagedDevice[];
  allDevices: ManagedDevice[];
  onDecision?: (decision: Decision) => void;
  showEmployee?: boolean;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="divide-y divide-surface-variant">
        {devices.map((device) => {
          const candidates = allDevices.filter(
            (candidate) =>
              candidate.employeeId === device.employeeId &&
              candidate.status === "PENDING_APPROVAL" &&
              candidate.id !== device.id,
          );
          return (
            <article
              key={device.id}
              className="grid gap-5 p-5 lg:grid-cols-[minmax(220px,1.2fr)_minmax(180px,.8fr)_auto] lg:items-center"
            >
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-zinc-50 text-primary">
                  {device.platform === "IOS" ? (
                    <Smartphone className="size-6" />
                  ) : (
                    <Laptop className="size-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-zinc-900">
                      {device.deviceModel || `${device.platform} device`}
                    </h2>
                    {device.isPrimary && (
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-outline">
                    {device.osVersion || "Unknown OS"} · App {device.appVersion || "unknown"}
                  </p>
                  {showEmployee && device.employee && (
                    <Link
                      href={`/app/employees/${device.employee.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      <UserRound className="size-4" /> {device.employee.fullName} ·{" "}
                      {device.employee.employeeCode}
                    </Link>
                  )}
                </div>
              </div>
              <div>
                <StatusBadge status={device.status} />
                <p className="mt-2 text-xs text-outline">
                  Registered {formatDate(device.registeredAt)}
                </p>
                <p className="mt-1 text-xs text-outline">
                  Last seen {device.lastSeenAt ? formatDate(device.lastSeenAt) : "never"}
                </p>
              </div>
              {onDecision && (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {device.status === "PENDING_APPROVAL" && (
                    <PrimaryButton
                      onClick={() => onDecision({ action: "approve", device })}
                    >
                      <CheckCircle2 className="size-4" /> Approve
                    </PrimaryButton>
                  )}
                  {(device.status === "PENDING_APPROVAL" || device.status === "ACTIVE") && (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-error px-4 text-sm font-semibold text-error"
                      onClick={() => onDecision({ action: "block", device })}
                    >
                      <ShieldAlert className="size-4" /> Block
                    </button>
                  )}
                  {device.status === "ACTIVE" && candidates.length > 0 && (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary"
                      onClick={() =>
                        onDecision({ action: "replace", device, candidates })
                      }
                    >
                      <RefreshCw className="size-4" /> Replace
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function DeviceDecisionDialog({
  decision,
  onClose,
  onComplete,
}: {
  decision: Decision;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [newDeviceId, setNewDeviceId] = useState(
    decision.action === "replace" ? decision.candidates[0]?.id ?? "" : "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (reason.trim().length < 5) {
      setError("Enter a clear reason of at least 5 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/devices/${decision.device.id}/${decision.action}`, {
        reason: reason.trim(),
        ...(decision.action === "replace" ? { newDeviceId } : {}),
      });
      await onComplete();
    } catch {
      setError(
        `The device could not be ${decision.action === "approve" ? "approved" : `${decision.action}d`}. Refresh and review its current state.`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-zinc-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-decision-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
            <h2 id="device-decision-title" className="text-xl font-bold capitalize">
              {decision.action} device
            </h2>
              <FeatureInfo helpKey="devices" />
            </div>
            <p className="mt-1 text-sm text-outline">
              {decision.device.deviceModel || decision.device.platform} ·{" "}
              {decision.device.employee?.fullName || "Employee device"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close device action"
            className="grid size-11 place-items-center rounded-full text-zinc-500 hover:bg-surface-variant"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-6 grid gap-4">
          {decision.action === "replace" && (
            <Field label="Replacement device">
              <select
                className={inputClass}
                value={newDeviceId}
                onChange={(event) => setNewDeviceId(event.target.value)}
              >
                {decision.candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.deviceModel || candidate.platform} · registered{" "}
                    {formatDate(candidate.registeredAt)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Decision reason">
            <textarea
              className={`${inputClass} min-h-28 py-3`}
              value={reason}
              maxLength={500}
              placeholder="Explain why this device action is being taken"
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {error && <ErrorState message={error} />}
          <PrimaryButton
            disabled={saving || reason.trim().length < 5 || (decision.action === "replace" && !newDeviceId)}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : `Confirm ${decision.action}`}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function deviceFilter(value: string | null): DeviceStatus | "ALL" {
  return value === "PENDING_APPROVAL" ||
    value === "ACTIVE" ||
    value === "BLOCKED" ||
    value === "REPLACED"
    ? value
    : "ALL";
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "success" | "danger";
}) {
  const tones = {
    neutral: "bg-zinc-50 text-primary",
    warning: "bg-amber-100 text-amber-900",
    success: "bg-emerald-100 text-emerald-900",
    danger: "bg-error-container text-on-error-container",
  };
  return (
    <Panel className="p-5">
      <div className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}>
        <ShieldCheck className="size-5" />
      </div>
      <div className="mt-4 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-outline">{label}</div>
    </Panel>
  );
}

function StatusBadge({ status }: { status: DeviceStatus }) {
  const styles: Record<DeviceStatus, string> = {
    PENDING_APPROVAL: "bg-amber-100 text-amber-900",
    ACTIVE: "bg-emerald-100 text-emerald-900",
    BLOCKED: "bg-error-container text-on-error-container",
    REPLACED: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function count(devices: ManagedDevice[] | null, status: DeviceStatus) {
  return devices?.filter((device) => device.status === status).length ?? 0;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
