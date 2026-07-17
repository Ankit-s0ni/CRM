"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Laptop,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState, Panel } from "./page-primitives";
import {
  formatClock,
  formatMinutes,
  localIsoDate,
  statusTone,
  type AttendanceDay,
  type AttendanceTimelineEvent,
} from "./attendance-runtime-types";

type MonthResponse = {
  data: {
    employee: {
      id: string;
      employeeCode: string;
      fullName: string;
      department: { name: string };
      designation: { name: string } | null;
    };
    month: string;
    days: AttendanceDay[];
    summary: {
      days: number;
      present: number;
      absent: number;
      halfDays: number;
      lateDays: number;
      workMinutes: number;
      overtimeMinutes: number;
    };
  };
};
type DayResponse = {
  data: AttendanceDay & {
    employee: MonthResponse["data"]["employee"];
    isLocked: boolean;
    exception: { exceptionType: string; reason: string } | null;
    timeline: AttendanceTimelineEvent[];
  };
};

export function AttendanceDetailView({
  employeeId,
  initialDate,
}: {
  employeeId: string;
  initialDate?: string;
}) {
  const startDate = initialDate ?? localIsoDate();
  const [month, setMonth] = useState(startDate.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [monthData, setMonthData] = useState<MonthResponse["data"] | null>(
    null,
  );
  const [dayData, setDayData] = useState<DayResponse["data"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient
      .get<MonthResponse>(
        `/attendance/employees/${employeeId}/month?month=${month}`,
      )
      .then(({ data }) => {
        if (active) {
          setMonthData(data.data);
          setError("");
          const preferred = data.data.days.at(-1);
          if (preferred) setSelectedDate(preferred.date);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Employee attendance could not be loaded or is outside your reporting scope.",
          );
      });
    return () => {
      active = false;
    };
  }, [employeeId, month]);
  useEffect(() => {
    if (!monthData?.days.some((day) => day.date === selectedDate)) return;
    let active = true;
    apiClient
      .get<DayResponse>(
        `/attendance/register/${employeeId}/day?date=${selectedDate}`,
      )
      .then(({ data }) => {
        if (active) setDayData(data.data);
      })
      .catch(() => {
        if (active) setDayData(null);
      });
    return () => {
      active = false;
    };
  }, [employeeId, monthData, selectedDate]);

  function moveMonth(offset: number) {
    const value = new Date(`${month}-01T12:00:00`);
    value.setMonth(value.getMonth() + offset);
    const next = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
    setMonth(next);
    setSelectedDate(`${next}-01`);
    setMonthData(null);
    setDayData(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href="/app/attendance/register"
          className="grid size-10 place-items-center rounded-xl border border-[#d8d4e3] bg-white"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-56 flex-1">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#4f46e5]">
            Attendance detail
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {monthData?.employee.fullName ?? "Employee attendance"}
          </h1>
          <p className="mt-1 text-xs text-[#777587]">
            {monthData
              ? `${monthData.employee.employeeCode} · ${monthData.employee.designation?.name ?? "Employee"} · ${monthData.employee.department.name}`
              : "Monthly calendar and evidence timeline"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#e4e1ee] bg-white p-1">
          <button
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
            className="grid size-9 place-items-center rounded-lg hover:bg-[#f0ecf9]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold">
            {new Intl.DateTimeFormat("en", {
              month: "long",
              year: "numeric",
            }).format(new Date(`${month}-15T12:00:00`))}
          </span>
          <button
            aria-label="Next month"
            onClick={() => moveMonth(1)}
            className="grid size-9 place-items-center rounded-lg hover:bg-[#f0ecf9]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>
      {error && (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      )}
      {!monthData ? (
        <LoadingState />
      ) : (
        <>
          <Summary data={monthData.summary} />
          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <MonthCalendar
              month={month}
              days={monthData.days}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
            <DayEvidence data={dayData} selectedDate={selectedDate} />
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ data }: { data: MonthResponse["data"]["summary"] }) {
  const values = [
    { label: "Present", value: data.present, color: "text-[#006e2d]" },
    { label: "Absent", value: data.absent, color: "text-[#ba1a1a]" },
    { label: "Half days", value: data.halfDays, color: "text-[#895100]" },
    { label: "Late days", value: data.lateDays, color: "text-[#895100]" },
    {
      label: "Worked",
      value: formatMinutes(data.workMinutes),
      color: "text-[#3525cd]",
    },
    {
      label: "Overtime",
      value: formatMinutes(data.overtimeMinutes),
      color: "text-[#006492]",
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {values.map((item) => (
        <article
          key={item.label}
          className="rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm"
        >
          <span className="text-xs text-[#777587]">{item.label}</span>
          <strong className={cn("mt-1 block text-xl", item.color)}>
            {item.value}
          </strong>
        </article>
      ))}
    </section>
  );
}

function MonthCalendar({
  month,
  days,
  selectedDate,
  onSelect,
}: {
  month: string;
  days: AttendanceDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const first = new Date(`${month}-01T12:00:00`);
  const count = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const offset = (first.getDay() + 6) % 7;
  const byDate = new Map(days.map((day) => [day.date, day]));
  return (
    <Panel className="overflow-hidden p-4 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="size-5 text-[#3525cd]" />
        <div>
          <h2 className="font-semibold">Monthly calendar</h2>
          <p className="text-xs text-[#777587]">
            Select a recorded day to inspect its evidence.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#777587]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <span key={label} className="py-2">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, "0")}`;
          const day = byDate.get(date);
          const tone = day ? statusTone(day.status) : null;
          return (
            <button
              key={date}
              disabled={!day}
              onClick={() => onSelect(date)}
              className={cn(
                "min-h-24 rounded-xl border p-2 text-left transition",
                day
                  ? "border-[#e4e1ee] bg-white hover:border-[#aaa3cd]"
                  : "border-transparent bg-[#f8f6fa] text-[#aaa3ad]",
                selectedDate === date &&
                  "border-[#3525cd] ring-2 ring-[#3525cd]/15",
              )}
            >
              <span className="text-xs font-bold">{index + 1}</span>
              {day && (
                <>
                  <span
                    className={cn(
                      "mt-2 block w-fit rounded-full px-2 py-1 text-[9px] font-bold uppercase",
                      tone?.className,
                    )}
                  >
                    {tone?.label}
                  </span>
                  <span className="mt-2 block text-[10px] text-[#777587]">
                    {formatMinutes(day.workMinutes)}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function DayEvidence({
  data,
  selectedDate,
}: {
  data: DayResponse["data"] | null;
  selectedDate: string;
}) {
  if (!data)
    return (
      <Panel>
        <EmptyState
          title="No evidence for this day"
          body={`There is no finalized or open attendance record for ${selectedDate}.`}
        />
      </Panel>
    );
  const tone = statusTone(data.status);
  return (
    <aside className="overflow-hidden rounded-xl border border-[#e4e1ee] bg-white shadow-sm xl:sticky xl:top-20">
      <div className="border-b border-[#e4e1ee] bg-gradient-to-br from-[#f3f0ff] to-[#eefbf3] p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777587]">
              Selected day
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {new Intl.DateTimeFormat("en", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              }).format(new Date(`${selectedDate}T12:00:00`))}
            </h2>
          </div>
          {data.isLocked && (
            <span className="grid size-9 place-items-center rounded-lg bg-white text-[#646273]">
              <LockKeyhole className="size-4" />
            </span>
          )}
        </div>
        <span
          className={cn(
            "mt-4 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase",
            tone.className,
          )}
        >
          {tone.label}
        </span>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="Worked" value={formatMinutes(data.workMinutes)} />
          <Mini label="Late" value={formatMinutes(data.lateMinutes)} />
          <Mini label="Overtime" value={formatMinutes(data.overtimeMinutes)} />
        </div>
      </div>
      {data.exception && (
        <div className="m-4 rounded-xl border border-[#c3c0ff] bg-[#f0edff] p-3 text-xs">
          <strong>{data.exception.exceptionType.replaceAll("_", " ")}</strong>
          <p className="mt-1 text-[#646273]">{data.exception.reason}</p>
        </div>
      )}
      <div className="p-5">
        <h3 className="font-semibold">Evidence timeline</h3>
        <div className="mt-5 grid gap-0">
          {data.timeline.map((event, index) => (
            <Timeline
              key={event.id}
              event={event}
              last={index === data.timeline.length - 1}
            />
          ))}
          {!data.timeline.length && (
            <p className="text-sm text-[#777587]">
              Calculated without punch evidence.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function Timeline({
  event,
  last,
}: {
  event: AttendanceTimelineEvent;
  last: boolean;
}) {
  const Icon =
    event.source === "MOBILE"
      ? Smartphone
      : event.source === "WEB"
        ? Laptop
        : event.source === "REGULARIZED"
          ? ShieldCheck
          : MapPin;
  return (
    <div className="grid grid-cols-[36px_1fr] gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full",
            event.timeSuspect
              ? "bg-[#ffdad6] text-[#ba1a1a]"
              : "bg-[#ece9ff] text-[#3525cd]",
          )}
        >
          <Icon className="size-4" />
        </span>
        {!last && <span className="min-h-10 w-px flex-1 bg-[#ddd8e7]" />}
      </div>
      <div className="pb-5">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-sm">
            {event.eventType.replaceAll("_", " ")}
          </strong>
          <span className="text-xs font-semibold">
            {formatClock(event.eventTime)}
          </span>
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-[#777587]">
          {event.source}
          {event.isOfflineSync ? " · Offline sync" : ""}
        </p>
        {event.timeSuspect && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#ba1a1a]">
            <TriangleAlert className="size-3" />
            Time requires review
          </p>
        )}
      </div>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/80 p-2">
      <strong className="block text-sm">{value}</strong>
      <span className="text-[9px] uppercase text-[#777587]">{label}</span>
    </div>
  );
}
