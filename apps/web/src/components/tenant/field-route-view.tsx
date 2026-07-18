"use client";

import { AlertTriangle, ArrowLeft, Clock3, Gauge, MapPin, Pause, Play, Route } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { AdminPage, ErrorState, LoadingState, Panel } from "./page-primitives";
import { FieldMap } from "./field-map";

type RouteData = {
  employeeId: string;
  routeDate: string;
  simplifiedPath: Array<{ latitude: number; longitude: number; capturedAt: string }>;
  distanceMeters: number;
  pingCount: number;
  trackingGapMinutes: number;
  stops: Array<{ latitude: number; longitude: number; startedAt: string; endedAt: string; dwellMinutes: number }>;
  gaps: Array<{ startedAt: string; endedAt: string; durationMinutes: number }>;
  punches: Array<{ id: string; eventType: string; eventTime: string; latitude: string | null; longitude: string | null }>;
};

export function FieldRouteView({ employeeId }: { employeeId: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [route, setRoute] = useState<RouteData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    let active = true;
    void fetchRoute(employeeId, date).then(
      (data) => {
        if (!active) return;
        setRoute(data);
        setProgress(100);
        setError("");
        setLoading(false);
      },
      () => {
        if (!active) return;
        setRoute(undefined);
        setError("No processed route is available for this employee and date.");
        setLoading(false);
      },
    );
    return () => { active = false; };
  }, [date, employeeId]);
  useEffect(() => {
    if (!playing || !route || progress >= 100) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(100, progress + 2);
      setProgress(next);
      if (next === 100) setPlaying(false);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [playing, progress, route]);

  function togglePlayback() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (progress >= 100) setProgress(0);
    setPlaying(true);
  }

  const visiblePath = route?.simplifiedPath.slice(0, Math.max(1, Math.ceil(route.simplifiedPath.length * progress / 100))) ?? [];
  const markers = [
    ...(route?.stops.map((stop, index) => ({ id: `stop-${index}`, latitude: stop.latitude, longitude: stop.longitude, label: `${stop.dwellMinutes}m stop`, tone: "stop" as const })) ?? []),
    ...(route?.punches.flatMap((punch) => punch.latitude && punch.longitude ? [{ id: punch.id, latitude: Number(punch.latitude), longitude: Number(punch.longitude), label: punch.eventType.replaceAll("_", " "), tone: "punch" as const }] : []) ?? []),
  ];

  return (
    <AdminPage
      action={<input aria-label="Route date" className="h-11 rounded-xl border border-[#c7c4d8] bg-white px-4 text-sm" max={new Date().toISOString().slice(0, 10)} onChange={(event) => { setLoading(true); setPlaying(false); setDate(event.target.value); }} type="date" value={date} />}
      description="Daily route evidence, dwell stops, tracking gaps, and attendance markers."
      title="Route Playback"
    >
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#3525cd]" href="/app/attendance/field"><ArrowLeft className="size-4" />Back to live board</Link>
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {loading ? <Panel className="p-5"><LoadingState /></Panel> : route && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <FieldMap markers={markers} path={visiblePath} />
            <Panel className="flex items-center gap-4 p-4">
              <button aria-label={playing ? "Pause playback" : "Play route"} className="grid size-11 place-items-center rounded-full bg-[#3525cd] text-white" onClick={togglePlayback} type="button">{playing ? <Pause className="size-5" /> : <Play className="size-5" />}</button>
              <input aria-label="Playback position" className="h-2 flex-1 accent-[#3525cd]" max="100" min="0" onChange={(event) => setProgress(Number(event.target.value))} type="range" value={progress} />
              <span className="w-12 text-right text-xs font-bold">{progress}%</span>
            </Panel>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={Route} label="Distance" value={`${(route.distanceMeters / 1000).toFixed(1)} km`} />
              <Metric icon={MapPin} label="Pings" value={String(route.pingCount)} />
              <Metric icon={Clock3} label="Stops" value={String(route.stops.length)} />
              <Metric icon={AlertTriangle} label="Gap time" value={`${route.trackingGapMinutes}m`} />
            </div>
            <Panel className="overflow-hidden">
              <div className="border-b border-[#e4e1ee] px-4 py-3 text-sm font-bold">Day timeline</div>
              <div className="max-h-[430px] space-y-1 overflow-y-auto p-3">
                {route.punches.map((punch) => <TimelineRow icon={Gauge} key={punch.id} label={punch.eventType.replaceAll("_", " ")} time={time(punch.eventTime)} />)}
                {route.stops.map((stop, index) => <TimelineRow icon={MapPin} key={`stop-${index}`} label={`Stopped for ${stop.dwellMinutes} minutes`} time={time(stop.startedAt)} />)}
                {route.gaps.map((gap, index) => <TimelineRow icon={AlertTriangle} key={`gap-${index}`} label={`Tracking gap · ${gap.durationMinutes} minutes`} time={time(gap.startedAt)} tone="amber" />)}
                {!route.punches.length && !route.stops.length && !route.gaps.length && <div className="p-6 text-center text-sm text-[#777587]">No timeline annotations.</div>}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

async function fetchRoute(employeeId: string, date: string) {
  const { data } = await apiClient.get<{ data: RouteData }>(`/field/employees/${employeeId}/routes/${date}`);
  return data.data;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Route; label: string; value: string }) {
  return <Panel className="p-4"><Icon className="mb-3 size-5 text-[#3525cd]" /><div className="text-xl font-bold">{value}</div><div className="text-xs text-[#777587]">{label}</div></Panel>;
}

function TimelineRow({ icon: Icon, label, time: value, tone }: { icon: typeof Route; label: string; time: string; tone?: "amber" }) {
  return <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-[#faf8fd]"><span className={`grid size-9 place-items-center rounded-full ${tone === "amber" ? "bg-[#fff0dc] text-[#a65712]" : "bg-[#f0ecf9] text-[#3525cd]"}`}><Icon className="size-4" /></span><div className="min-w-0 flex-1 text-sm font-medium">{label}</div><span className="text-xs text-[#777587]">{value}</span></div>;
}

function time(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
