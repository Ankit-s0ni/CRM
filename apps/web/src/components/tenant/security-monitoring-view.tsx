"use client";

import type { AxiosError } from "axios";
import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Fingerprint,
  LocateOff,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserRoundX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { FeatureInfo, RouteFeatureInfo } from "@/components/help/feature-info";

type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
type AlertType =
  | "GEOFENCE_VIOLATION"
  | "FACE_MISMATCH"
  | "MOCK_LOCATION"
  | "ROOTED_DEVICE"
  | "UNREGISTERED_DEVICE"
  | "DEVICE_MISMATCH"
  | "CLOCK_TAMPER"
  | "ABSENTEE";
type SecurityAlert = {
  id: string;
  employeeId: string;
  verificationLogId: string | null;
  alertType: AlertType;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  details: {
    code?: string;
    mapPoint?: {
      latitude: number;
      longitude: number;
      accuracyMeters?: number;
    };
    distanceMeters?: number;
    scoreCategory?: string;
    hasSelfieEvidence?: boolean;
    deviceId?: string;
  };
  status: AlertStatus;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    department: { id: string; name: string } | null;
  } | null;
};
type AlertResponse = {
  data: SecurityAlert[];
  meta: { page: number; limit: number; total: number; pages: number };
};
type Evidence = {
  mapPoint: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
  } | null;
  distanceMeters: number | null;
  scoreCategory: string | null;
  selfie: { url: string; expiresIn: number } | null;
};

const filters: Array<{ label: string; value: AlertType | "" }> = [
  { label: "All events", value: "" },
  { label: "Mock location", value: "MOCK_LOCATION" },
  { label: "Face mismatch", value: "FACE_MISMATCH" },
  { label: "Outside geofence", value: "GEOFENCE_VIOLATION" },
  { label: "Blocked device", value: "DEVICE_MISMATCH" },
  { label: "Clock tampering", value: "CLOCK_TAMPER" },
];

export function SecurityMonitoringView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canManage = permissions.includes("attendance.security-alerts.manage");
  const canViewEvidence = permissions.includes("attendance.verification.read");
  const canManageDevices = permissions.includes("attendance.devices.manage");
  const [response, setResponse] = useState<AlertResponse | null>(null);
  const type = alertType(searchParams.get("alertType"));
  const status = alertStatus(searchParams.get("status"));
  const severity = alertSeverity(searchParams.get("severity"));
  const page = positivePage(searchParams.get("page"));
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SecurityAlert | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [busy, setBusy] = useState(false);

  function updateQuery(patch: {
    type?: AlertType | "";
    status?: AlertStatus | "";
    severity?: SecurityAlert["severity"] | "";
    page?: number;
  }) {
    const params = new URLSearchParams();
    const nextType = patch.type ?? type;
    const nextStatus = patch.status ?? status;
    const nextSeverity = patch.severity ?? severity;
    const nextPage = patch.page ?? 1;
    if (nextType) params.set("alertType", nextType);
    if (nextStatus) params.set("status", nextStatus);
    else if (patch.status === "") params.set("status", "ALL");
    if (nextSeverity) params.set("severity", nextSeverity);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }

  async function load() {
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
    });
    if (type) params.set("alertType", type);
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    try {
      const { data } = await apiClient.get<AlertResponse>(
        `/security-alerts?${params}`,
      );
      setResponse(data);
      setError("");
    } catch {
      setError("Security events could not be loaded. Please retry.");
    }
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (type) params.set("alertType", type);
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    apiClient
      .get<AlertResponse>(`/security-alerts?${params}`)
      .then(({ data }) => {
        if (active) {
          setResponse(data);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError("Security events could not be loaded. Please retry.");
      });
    return () => {
      active = false;
    };
  }, [page, severity, status, type]);

  async function openAlert(alert: SecurityAlert) {
    setSelected(alert);
    setEvidence(null);
    if (!canViewEvidence || !alert.verificationLogId) return;
    try {
      const { data } = await apiClient.get<{ data: Evidence }>(
        `/security-alerts/${alert.id}/evidence`,
      );
      setEvidence(data.data);
    } catch {
      setError("Private evidence could not be authorized.");
    }
  }

  async function decide(action: "acknowledge" | "resolve" | "dismiss") {
    if (!selected) return;
    const note = window.prompt(
      `${action[0].toUpperCase()}${action.slice(1)} note`,
    );
    if (!note?.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(`/security-alerts/${selected.id}/${action}`, {
        note: note.trim(),
      });
      setSelected(null);
      await load();
    } catch (requestError) {
      setError(apiMessage(requestError, "The alert could not be updated."));
    } finally {
      setBusy(false);
    }
  }

  async function blockDevice(alert: SecurityAlert) {
    if (!alert.details.deviceId) return;
    const reason = window.prompt("Reason for blocking this device");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(`/devices/${alert.details.deviceId}/block`, {
        reason: reason.trim(),
      });
      setSelected(null);
      await load();
    } catch (requestError) {
      setError(apiMessage(requestError, "The device could not be blocked."));
    } finally {
      setBusy(false);
    }
  }

  const rows = response?.data ?? [];
  return (
    <div className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1440px] px-4 py-8 lg:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[.16em] text-[#4f46e5]">
            Attendance integrity
          </p>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-[-.02em] text-[#1b1b24]">
              Security Monitoring Feed
            </h1>
            <RouteFeatureInfo />
          </div>
          <p className="mt-1 text-base text-[#464555]">
            Real-time integrity tracking for attendance and geofencing.
          </p>
        </div>
        <Card className="flex min-w-72 items-center gap-6 rounded-xl border-[#d9d5e3] bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#777587]">
              Violations in view
            </p>
            <p className="text-2xl font-bold text-[#ba1a1a]">
              {response?.meta.total ?? 0}
            </p>
          </div>
          <div className="flex h-12 flex-1 items-end gap-1" aria-hidden>
            {[35, 60, 48, 72, 100, 78, 96].map((height, index) => (
              <span
                key={height + index}
                className={cn(
                  "flex-1 rounded-t-sm",
                  index === 6 ? "bg-[#ba1a1a]" : "bg-[#4f46e5]/15",
                )}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </Card>
      </header>

      <div className="mb-7 flex items-center gap-3 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Button
            aria-pressed={type === filter.value}
            key={filter.label}
            variant="outline"
            onClick={() => updateQuery({ type: filter.value })}
            className={cn(
              "shrink-0 rounded-full border-0 px-5 text-sm font-semibold",
              type === filter.value
                ? "bg-[#3525cd] text-white hover:bg-[#4f46e5] hover:text-white"
                : "bg-[#eae6f4] text-[#464555] hover:bg-[#e2dfff]",
            )}
          >
            {filter.label}
            {!filter.value && (
              <span className="rounded bg-white/20 px-1.5 text-[10px]">
                {response?.meta.total ?? 0}
              </span>
            )}
          </Button>
        ))}
        <select
          aria-label="Alert status"
          value={status}
          onChange={(event) =>
            updateQuery({ status: event.target.value as AlertStatus | "" })
          }
          className="ml-auto h-9 shrink-0 rounded-full border border-[#c7c4d8] bg-white px-4 text-sm font-semibold text-[#464555]"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        {severity && (
          <button
            className="shrink-0 rounded-full bg-[#ffdad6] px-4 py-2 text-xs font-bold text-[#93000a]"
            onClick={() => updateQuery({ severity: "" })}
            type="button"
          >
            {severity} severity · clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-[#ffdad6] p-4 text-[#93000a]">
          <AlertTriangle className="size-5" />
          <p className="text-sm font-medium">{error}</p>
          <Button variant="ghost" className="ml-auto" onClick={load}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      )}

      {!response ? (
        <LoadingFeed />
      ) : rows.length ? (
        <section className="grid grid-cols-12 gap-6">
          {rows.map((alert, index) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              featured={index === 0}
              canManageDevices={canManageDevices}
              onOpen={() => openAlert(alert)}
              onBlock={() => blockDevice(alert)}
            />
          ))}
        </section>
      ) : (
        <Card className="grid min-h-72 place-items-center border-[#d9d5e3] bg-white text-center">
          <div>
            <ShieldCheck className="mx-auto mb-4 size-12 text-[#006e2d]" />
            <h2 className="text-xl font-bold">No matching security events</h2>
            <p className="mt-1 text-sm text-[#777587]">
              Change the filters or check back after new attendance attempts.
            </p>
          </div>
        </Card>
      )}

      {response && response.meta.pages > 1 && (
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= response.meta.pages}
            onClick={() => updateQuery({ page: page + 1 })}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {selected && (
        <AlertDrawer
          alert={selected}
          evidence={evidence}
          busy={busy}
          canManage={canManage}
          canManageDevices={canManageDevices}
          onClose={() => setSelected(null)}
          onDecision={decide}
          onBlock={() => blockDevice(selected)}
        />
      )}
    </div>
  );
}

function AlertCard({
  alert,
  featured,
  canManageDevices,
  onOpen,
  onBlock,
}: {
  alert: SecurityAlert;
  featured: boolean;
  canManageDevices: boolean;
  onOpen: () => void;
  onBlock: () => void;
}) {
  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-xl border-[#d9d5e3] bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg",
        featured
          ? "col-span-12 border-l-4 border-l-[#ba1a1a] lg:col-span-8"
          : "col-span-12 md:col-span-6 lg:col-span-4",
      )}
    >
      <div
        className={cn("flex h-full gap-5", featured && "flex-col md:flex-row")}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4 flex items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                severityClass(alert.severity),
              )}
            >
              {alert.severity}
            </span>
            <span className="text-xs font-semibold text-[#777587]">
              {relativeTime(alert.createdAt)}
              {alert.employee?.department?.name
                ? ` • ${alert.employee.department.name}`
                : ""}
            </span>
          </div>
          <div className="mb-4 flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e2dfff] text-[#3525cd]">
              <AlertTypeIcon type={alert.alertType} />
            </div>
            <div>
              <h2 className="text-xl font-semibold leading-7 text-[#1b1b24]">
                {alert.title}
              </h2>
              <p className="mt-1 text-sm text-[#464555]">
                <strong>
                  {alert.employee?.fullName ?? "Unknown employee"}
                </strong>
                {alert.employee?.employeeCode
                  ? ` • ${alert.employee.employeeCode}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-4 border-y border-[#e4e1ee] py-4 text-sm">
            <Metric
              label="Violation"
              value={typeLabel(alert.alertType)}
              danger
            />
            <Metric label="Status" value={statusLabel(alert.status)} />
            {alert.details.distanceMeters !== undefined && (
              <Metric
                label="Distance"
                value={formatDistance(alert.details.distanceMeters)}
              />
            )}
            {alert.details.scoreCategory && (
              <Metric
                label="Face confidence"
                value={alert.details.scoreCategory}
              />
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-3">
            <Button
              onClick={onOpen}
              className="bg-[#3525cd] text-white hover:bg-[#4f46e5]"
            >
              <Eye className="size-4" /> View verification log
            </Button>
            {canManageDevices && alert.details.deviceId && (
              <Button variant="outline" onClick={onBlock}>
                <Ban className="size-4" /> Block device
              </Button>
            )}
          </div>
        </div>
        {featured && (
          <MapPreview
            point={alert.details.mapPoint}
            distance={alert.details.distanceMeters}
          />
        )}
      </div>
    </Card>
  );
}

function AlertDrawer({
  alert,
  evidence,
  busy,
  canManage,
  canManageDevices,
  onClose,
  onDecision,
  onBlock,
}: {
  alert: SecurityAlert;
  evidence: Evidence | null;
  busy: boolean;
  canManage: boolean;
  canManageDevices: boolean;
  onClose: () => void;
  onDecision: (action: "acknowledge" | "resolve" | "dismiss") => void;
  onBlock: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/40" onMouseDown={onClose}>
      <aside
        className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-[#fcf8ff] p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#4f46e5]">
              Verification evidence
            </p>
            <h2 className="mt-1 text-2xl font-bold">{alert.title}</h2>
            <FeatureInfo helpKey={securityHelpKey(alert.alertType)} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" />
          </Button>
        </div>
        <Card className="mb-5 border-[#d9d5e3] bg-white p-5">
          <div className="grid grid-cols-2 gap-5">
            <Metric
              label="Employee"
              value={alert.employee?.fullName ?? "Unknown"}
            />
            <Metric label="Status" value={statusLabel(alert.status)} />
            <Metric label="Type" value={typeLabel(alert.alertType)} danger />
            <Metric
              label="Recorded"
              value={new Date(alert.createdAt).toLocaleString()}
            />
          </div>
        </Card>
        {evidence?.mapPoint && (
          <MapPreview
            point={evidence.mapPoint}
            distance={evidence.distanceMeters ?? undefined}
          />
        )}
        {evidence?.selfie && (
          <Card className="mt-5 overflow-hidden border-[#d9d5e3] bg-white p-4">
            {/* The URL is fetched only after forensic authorization and expires in 60 seconds. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evidence.selfie.url}
              alt="Authorized attendance attempt evidence"
              className="max-h-80 w-full rounded-lg object-contain"
            />
            <p className="mt-2 text-xs text-[#777587]">
              Private evidence link expires in {evidence.selfie.expiresIn}{" "}
              seconds.
            </p>
          </Card>
        )}
        {!evidence && alert.verificationLogId && (
          <Card className="mt-5 grid min-h-36 place-items-center border-[#d9d5e3] bg-white">
            <p className="text-sm text-[#777587]">
              Authorizing private evidence…
            </p>
          </Card>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {canManage && alert.status === "OPEN" && (
            <Button disabled={busy} onClick={() => onDecision("acknowledge")}>
              Acknowledge
            </Button>
          )}
          {canManage && ["OPEN", "ACKNOWLEDGED"].includes(alert.status) && (
            <>
              <Button disabled={busy} onClick={() => onDecision("resolve")}>
                Resolve
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => onDecision("dismiss")}
              >
                Dismiss
              </Button>
            </>
          )}
          {canManageDevices && alert.details.deviceId && (
            <Button
              disabled={busy}
              variant="destructive"
              className="ml-auto"
              onClick={onBlock}
            >
              <Ban className="size-4" /> Block device
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

function alertType(value: string | null): AlertType | "" {
  return filters.some((filter) => filter.value === value)
    ? (value as AlertType | "")
    : "";
}

function alertStatus(value: string | null): AlertStatus | "" {
  if (value === null) return "OPEN";
  if (value === "ALL") return "";
  return value === "OPEN" ||
    value === "ACKNOWLEDGED" ||
    value === "RESOLVED" ||
    value === "DISMISSED"
    ? value
    : "";
}

function alertSeverity(value: string | null): SecurityAlert["severity"] | "" {
  return value === "INFO" || value === "WARNING" || value === "CRITICAL"
    ? value
    : "";
}

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function securityHelpKey(type: AlertType) {
  if (type === "FACE_MISMATCH") return "selfie-verification" as const;
  if (type === "GEOFENCE_VIOLATION" || type === "MOCK_LOCATION") {
    return "location-verification" as const;
  }
  return "devices" as const;
}

function MapPreview({
  point,
  distance,
}: {
  point?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
  };
  distance?: number;
}) {
  return (
    <div className="relative min-h-48 w-full overflow-hidden rounded-xl border border-[#c7c4d8] bg-[#f0ecf9] md:w-64">
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(#c7c4d8_1px,transparent_1px),linear-gradient(90deg,#c7c4d8_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#4f46e5]/50 bg-[#4f46e5]/10" />
      <MapPin className="absolute left-[72%] top-[28%] size-9 fill-[#ba1a1a] text-[#ba1a1a] drop-shadow" />
      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 p-2 text-center text-[10px] font-bold shadow backdrop-blur">
        {distance !== undefined
          ? `${formatDistance(distance)} FROM APPROVED ZONE`
          : point
            ? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
            : "LOCATION EVIDENCE UNAVAILABLE"}
      </div>
    </div>
  );
}

function LoadingFeed() {
  return (
    <div
      className="grid grid-cols-12 gap-6"
      aria-label="Loading security events"
    >
      {[8, 4, 5, 3, 4].map((span, index) => (
        <div
          key={`${span}-${index}`}
          className={cn(
            "col-span-12 h-64 animate-pulse rounded-xl bg-[#eae6f4]",
            span === 8 ? "lg:col-span-8" : "md:col-span-6 lg:col-span-4",
          )}
        />
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777587]">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-sm font-semibold",
          danger && "text-[#ba1a1a]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AlertTypeIcon({ type }: { type: AlertType }) {
  if (type === "GEOFENCE_VIOLATION") return <LocateOff className="size-6" />;
  if (type === "FACE_MISMATCH") return <Fingerprint className="size-6" />;
  if (type === "MOCK_LOCATION" || type === "UNREGISTERED_DEVICE") {
    return <Smartphone className="size-6" />;
  }
  if (type === "ROOTED_DEVICE") return <ShieldAlert className="size-6" />;
  if (type === "DEVICE_MISMATCH") return <UserRoundX className="size-6" />;
  if (type === "CLOCK_TAMPER") return <Clock3 className="size-6" />;
  return <AlertTriangle className="size-6" />;
}

function typeLabel(type: AlertType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function statusLabel(status: AlertStatus) {
  return status[0] + status.slice(1).toLowerCase();
}

function severityClass(severity: SecurityAlert["severity"]) {
  if (severity === "CRITICAL") return "bg-[#ffdad6] text-[#93000a]";
  if (severity === "WARNING") return "bg-[#ffdcc3] text-[#6e3900]";
  return "bg-[#e2dfff] text-[#3525cd]";
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function relativeTime(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString();
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as AxiosError<{ message?: string }>;
  return apiError.response?.data?.message ?? fallback;
}
