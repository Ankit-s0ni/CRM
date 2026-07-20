"use client";

import { Activity, BatteryMedium, CircleDot, LocateFixed, RefreshCw, Route, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { AdminPage, ErrorState, LoadingState, Panel, PrimaryButton } from "./page-primitives";
import { FieldMap } from "./field-map";
import { FeatureInfo } from "@/components/help/feature-info";

type PresenceState = "LIVE" | "STALE" | "OFFLINE";
type FieldEmployee = {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string | null;
  department: { id: string; name: string };
  office: {
    id: string;
    officeName: string;
    latitude: string | number;
    longitude: string | number;
    radiusMeters: number;
  } | null;
  presence: PresenceState;
  session: { id: string; startedAt: string; lastPingAt: string | null } | null;
  location: {
    latitude: number;
    longitude: number;
    accuracyM: number | null;
    speedMps: number | null;
    batteryLevel: number | null;
    capturedAt: string;
  } | null;
};

export function FieldMonitoringView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore(({ accessToken }) => accessToken);
  const tenantId = useAuthStore(({ user }) => user?.tenantId);
  const [employees, setEmployees] = useState<FieldEmployee[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const filter = presenceFilter(searchParams.get("presence"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const { data } = await apiClient.get<{ data: FieldEmployee[] }>("/field/employees/live");
      setEmployees(data.data);
      setSelectedId((current) => current ?? data.data[0]?.id);
      setError("");
    } catch {
      setError("Live field locations are temporarily unavailable. The board will retry automatically.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const poll = () => {
      void fetchLiveEmployees().then(
        (employees) => {
          if (!active) return;
          setEmployees(employees);
          setSelectedId((current) => current ?? employees[0]?.id);
          setError("");
          setLoading(false);
        },
        () => {
          if (!active) return;
          setError("Live field locations are temporarily unavailable. The board will retry automatically.");
          setLoading(false);
        },
      );
    };
    poll();
    const timer = window.setInterval(poll, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !tenantId) return;
    const controller = new AbortController();
    void consumeFieldStream({ accessToken, tenantId, signal: controller.signal }, (event) => {
      setEmployees((current) => current.map((employee) =>
        employee.id === event.employeeId
          ? { ...employee, presence: "LIVE", location: { ...employee.location, ...event } as FieldEmployee["location"] }
          : employee,
      ));
    });
    return () => controller.abort();
  }, [accessToken, tenantId]);

  const filtered = employees.filter((employee) => filter === "ALL" || employee.presence === filter);
  const selected = employees.find(({ id }) => id === selectedId);
  const markers = filtered.flatMap((employee) => employee.location ? [{
    id: employee.id,
    latitude: employee.location.latitude,
    longitude: employee.location.longitude,
    label: employee.fullName,
    tone: employee.presence.toLowerCase() as "live" | "stale" | "offline",
  }] : []);
  const geofences = employees.flatMap((employee) => employee.office ? [{
    id: employee.office.id,
    latitude: Number(employee.office.latitude),
    longitude: Number(employee.office.longitude),
    radiusMeters: employee.office.radiusMeters,
    label: employee.office.officeName,
  }] : []);

  return (
    <AdminPage
      action={<PrimaryButton onClick={() => void refresh()}><RefreshCw className="size-4" />Refresh</PrimaryButton>}
      description="Live, stale, and offline field employees with privacy-safe location evidence."
      title="Field Operations"
    >
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#d9d5e5] bg-[#f5f2ff] p-4 text-sm leading-6 text-[#545160]">
        <FeatureInfo helpKey="background-tracking" />
        <p>
          Location is shown only for employees enabled by an active field
          attendance policy and only during eligible work sessions. Raw route
          evidence follows the workspace retention policy.
        </p>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Field employees" value={employees.length} icon={UsersRound} />
        <Stat label="Live now" value={employees.filter(({ presence }) => presence === "LIVE").length} icon={Activity} tone="green" />
        <Stat label="Stale" value={employees.filter(({ presence }) => presence === "STALE").length} icon={CircleDot} tone="amber" />
        <Stat label="Offline" value={employees.filter(({ presence }) => presence === "OFFLINE").length} icon={LocateFixed} />
      </div>
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="overflow-hidden">
          <div className="border-b border-[#e4e1ee] p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#777587]">Team presence</div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "LIVE", "STALE", "OFFLINE"] as const).map((state) => (
                <button
                  aria-pressed={filter === state}
                  className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", filter === state ? "bg-[#302f39] text-white" : "bg-[#f0ecf9] text-[#5e5b68]")}
                  key={state}
                  onClick={() =>
                    router.push(
                      `${pathname}${state === "ALL" ? "" : `?presence=${state}`}`,
                      { scroll: false },
                    )
                  }
                  type="button"
                >{state}</button>
              ))}
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto p-2">
            {loading ? <LoadingState /> : filtered.map((employee) => (
              <button
                className={cn("mb-1 w-full rounded-xl border p-3 text-left transition", selectedId === employee.id ? "border-[#4f46e5] bg-[#f0ecf9]" : "border-transparent hover:bg-[#faf8fd]")}
                key={employee.id}
                onClick={() => setSelectedId(employee.id)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span className={cn("size-2.5 rounded-full", employee.presence === "LIVE" ? "bg-[#138a55]" : employee.presence === "STALE" ? "bg-[#c06b18]" : "bg-[#777587]")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{employee.fullName}</div>
                    <div className="truncate text-xs text-[#777587]">{employee.designation ?? employee.employeeCode} · {employee.department.name}</div>
                  </div>
                  <span className="text-[10px] font-bold text-[#777587]">{employee.presence}</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          <FieldMap geofences={geofences} markers={markers} onMarkerSelect={setSelectedId} selectedId={selectedId} />
          {selected && (
            <Panel className="flex flex-wrap items-center gap-5 p-4">
              <div className="min-w-48 flex-1">
                <div className="text-lg font-bold">{selected.fullName}</div>
                <div className="text-sm text-[#777587]">Last update {selected.location ? relativeTime(selected.location.capturedAt) : "not available"}</div>
              </div>
              <div className="flex items-center gap-2 text-sm"><BatteryMedium className="size-4" />{selected.location?.batteryLevel ?? "--"}%</div>
              <div className="text-sm">Accuracy {selected.location?.accuracyM ?? "--"}m</div>
              <Link className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white" href={`/app/attendance/field/${selected.id}/route`}>
                <Route className="size-4" />View route
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}

function presenceFilter(value: string | null): "ALL" | PresenceState {
  return value === "LIVE" || value === "STALE" || value === "OFFLINE"
    ? value
    : "ALL";
}

async function fetchLiveEmployees() {
  const { data } = await apiClient.get<{ data: FieldEmployee[] }>("/field/employees/live");
  return data.data;
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Activity; tone?: "green" | "amber" }) {
  return <Panel className="flex items-center gap-4 p-4"><span className={cn("grid size-11 place-items-center rounded-xl bg-[#f0ecf9] text-[#3525cd]", tone === "green" && "bg-[#d9f5e7] text-[#138a55]", tone === "amber" && "bg-[#fff0dc] text-[#a65712]")}><Icon className="size-5" /></span><div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-[#777587]">{label}</div></div></Panel>;
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1_000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3_600)}h ago`;
}

async function consumeFieldStream(
  context: { accessToken: string; tenantId: string; signal: AbortSignal },
  onLocation: (event: NonNullable<FieldEmployee["location"]> & { employeeId: string }) => void,
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
  try {
    const response = await fetch(`${baseUrl}/field/stream`, {
      headers: { Authorization: `Bearer ${context.accessToken}`, "x-tenant-id": context.tenantId, Accept: "text/event-stream" },
      signal: context.signal,
    });
    if (!response.ok || !response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (!context.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
        const type = frame.split("\n").find((line) => line.startsWith("event: "))?.slice(7);
        if (data && type === "location") onLocation(JSON.parse(data));
      }
    }
  } catch {
    // The 30-second authoritative poll keeps the board useful without SSE.
  }
}
