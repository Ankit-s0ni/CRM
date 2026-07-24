"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Laptop,
  LockKeyhole,
  MapPin,
  PencilLine,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { RouteFeatureInfo } from "@/features/platform/help/feature-info";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";
import {
  formatClock,
  formatMinutes,
  localIsoDate,
  statusTone,
  type AttendanceDay,
  type AttendanceTimelineEvent,
} from "@/features/products/attendance/core/attendance-runtime-types";

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
  returnTo,
  embedded = false,
}: {
  employeeId: string;
  initialDate?: string;
  returnTo: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const startDate = initialDate ?? localIsoDate();
  const [month, setMonth] = useState(startDate.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [monthData, setMonthData] = useState<MonthResponse["data"] | null>(
    null,
  );
  const [dayData, setDayData] = useState<DayResponse["data"] | null>(null);
  const [error, setError] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const canCorrect = permissions.some((permission) =>
    [
      "attendance.regularizations.manage",
      "attendance.approvals.manage",
    ].includes(permission),
  );
  const visibleDayData = dayData?.date === selectedDate ? dayData : null;

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
          const today = localIsoDate();
          const preferred =
            data.data.days.find((day) => day.date === today) ??
            data.data.days
              .toReversed()
              .find(
                (day) => day.date <= today && day.status !== "NOT_APPLICABLE",
              ) ??
            data.data.days[0];
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
    <div
      className={cn(
        "mx-auto w-full max-w-[1600px]",
        embedded ? "py-1" : "p-4 lg:p-6",
      )}
    >
      <header className="mb-6 flex flex-wrap items-center gap-4">
        {!embedded && (
          <Link
            aria-label="Back to attendance register"
            href={returnTo}
            className="grid size-10 place-items-center rounded-xl border border-zinc-300 bg-white"
          >
            <ArrowLeft className="size-4" />
          </Link>
        )}
        <div className="min-w-56 flex-1">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary-container">
            {embedded ? "Employee attendance" : "Attendance detail"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {embedded
                ? "Monthly attendance calendar"
                : (monthData?.employee.fullName ?? "Employee attendance")}
            </h1>
            <RouteFeatureInfo />
          </div>
          <p className="mt-1 text-xs text-outline">
            {embedded
              ? "Working days, weekly offs, approved leave, and attendance records."
              : monthData
                ? `${monthData.employee.employeeCode} · ${monthData.employee.designation?.name ?? "Employee"} · ${monthData.employee.department.name}`
                : "Monthly calendar and evidence timeline"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-surface-variant bg-white p-1">
          <button
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
            className="grid size-9 place-items-center rounded-lg hover:bg-zinc-50"
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
            className="grid size-9 place-items-center rounded-lg hover:bg-zinc-50"
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
              allowMissing={canCorrect}
            />
            <DayEvidence
              data={visibleDayData}
              selectedDate={selectedDate}
              onCorrect={canCorrect ? () => setCorrectionOpen(true) : undefined}
            />
          </div>
        </>
      )}
      {correctionOpen && monthData && (
        <CreateCorrectionDialog
          data={visibleDayData}
          employeeId={employeeId}
          employeeName={monthData.employee.fullName}
          selectedDate={selectedDate}
          onClose={() => setCorrectionOpen(false)}
          onCreated={(id) =>
            router.push(`/app/attendance/regularizations/${id}`)
          }
        />
      )}
    </div>
  );
}

function Summary({ data }: { data: MonthResponse["data"]["summary"] }) {
  const values = [
    { label: "Present", value: data.present, color: "text-emerald-800" },
    { label: "Absent", value: data.absent, color: "text-error" },
    { label: "Half days", value: data.halfDays, color: "text-amber-800" },
    { label: "Late days", value: data.lateDays, color: "text-amber-800" },
    {
      label: "Worked",
      value: formatMinutes(data.workMinutes),
      color: "text-primary",
    },
    {
      label: "Overtime",
      value: formatMinutes(data.overtimeMinutes),
      color: "text-sky-700",
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {values.map((item) => (
        <article
          key={item.label}
          className="rounded-xl border border-surface-variant bg-white p-4 shadow-sm"
        >
          <span className="text-xs text-outline">{item.label}</span>
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
  allowMissing,
}: {
  month: string;
  days: AttendanceDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
  allowMissing: boolean;
}) {
  const first = new Date(`${month}-01T12:00:00`);
  const count = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const offset = (first.getDay() + 6) % 7;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const legend = [
    "PRESENT",
    "LATE",
    "ABSENT",
    "ON_LEAVE",
    "HOLIDAY",
    "WEEKLY_OFF",
    "WORKING_DAY",
  ] as const;
  return (
    <Panel className="overflow-hidden p-4 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="size-5 text-primary" />
        <div>
          <h2 className="font-semibold">Monthly calendar</h2>
          <p className="text-xs text-outline">
            Select a recorded day to inspect its evidence.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-outline">
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
          const selectable =
            Boolean(day) || (allowMissing && date <= localIsoDate());
          const tone = day ? statusTone(day.status) : null;
          const dayNumber = index + 1;
          return (
            <button
              key={date}
              disabled={!selectable}
              onClick={() => onSelect(date)}
              className={cn(
                "min-h-24 rounded-xl border p-2 text-left transition",
                selectable
                  ? "border-surface-variant bg-white hover:border-zinc-400"
                  : "border-transparent bg-zinc-50 text-zinc-400",
                day &&
                  tone &&
                  "border-current/10 bg-[color:var(--calendar-bg)] text-[color:var(--calendar-fg)]",
                selectedDate === date &&
                  "border-primary ring-2 ring-primary/15",
              )}
              style={
                day && tone
                  ? ({
                      "--calendar-bg": tone.calendarBg,
                      "--calendar-fg": tone.calendarFg,
                    } as CSSProperties)
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold">{dayNumber}</span>
                {day && (
                  <span
                    className={cn(
                      "mt-0.5 size-2 shrink-0 rounded-full",
                      tone?.dot,
                    )}
                  />
                )}
              </div>
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
                  <span className="mt-2 block text-[10px] text-outline">
                    {formatMinutes(day.workMinutes)}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-outline">
        {legend.map((status) => {
          const tone = statusTone(status);
          return (
            <span key={status} className="inline-flex items-center gap-2">
              <span className={cn("size-2 rounded-full", tone.dot)} />
              {tone.label}
            </span>
          );
        })}
      </div>
    </Panel>
  );
}

function DayEvidence({
  data,
  selectedDate,
  onCorrect,
}: {
  data: DayResponse["data"] | null;
  selectedDate: string;
  onCorrect?: () => void;
}) {
  if (!data)
    return (
      <Panel>
        <EmptyState
          title="No evidence for this day"
          body={`There is no finalized or open attendance record for ${selectedDate}.`}
        />
        {onCorrect && selectedDate <= localIsoDate() && (
          <div className="px-5 pb-5">
            <PrimaryButton className="w-full" onClick={onCorrect}>
              <PencilLine className="size-4" />
              Mark attendance manually
            </PrimaryButton>
          </div>
        )}
      </Panel>
    );
  const tone = statusTone(data.status);
  return (
    <aside className="overflow-hidden rounded-xl border border-surface-variant bg-white shadow-sm xl:sticky xl:top-20">
      <div className="border-b border-surface-variant bg-gradient-to-br from-zinc-50 to-[#eefbf3] p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-outline">
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
            <span className="grid size-9 place-items-center rounded-lg bg-white text-on-surface-variant">
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
        <div className="m-4 rounded-xl border border-zinc-200 bg-surface-variant p-3 text-xs">
          <strong>{data.exception.exceptionType.replaceAll("_", " ")}</strong>
          <p className="mt-1 text-on-surface-variant">
            {data.exception.reason}
          </p>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Evidence timeline</h3>
          {onCorrect && !data.isLocked && (
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-container"
              onClick={onCorrect}
            >
              <PencilLine className="size-4" />
              {data.status === "ABSENT"
                ? "Mark present / Correct"
                : "Correct attendance"}
            </button>
          )}
        </div>
        <div className="mt-5 grid gap-0">
          {data.timeline.map((event, index) => (
            <Timeline
              key={event.id}
              event={event}
              last={index === data.timeline.length - 1}
            />
          ))}
          {!data.timeline.length && (
            <p className="text-sm text-outline">
              Calculated without punch evidence.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function CreateCorrectionDialog({
  data,
  employeeId,
  employeeName,
  selectedDate,
  onClose,
  onCreated,
}: {
  data: DayResponse["data"] | null;
  employeeId: string;
  employeeName: string;
  selectedDate: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  async function submit() {
    if (!data && (!checkin || !checkout)) {
      setError(
        "Check-in and checkout are both required when marking an unrecorded day.",
      );
      return;
    }
    if (!checkin && !checkout) {
      setError("Enter a corrected check-in or checkout time.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Add a short reason for the audit trail.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await apiClient.post<{ data: { id: string } }>(
        `/regularizations/employees/${employeeId}`,
        {
          attendanceLogId: data?.id,
          attendanceDate: data ? undefined : selectedDate,
          requestedCheckin: checkin
            ? correctedTimestamp(selectedDate, checkin)
            : undefined,
          requestedCheckout: checkout
            ? correctedTimestamp(selectedDate, checkout)
            : undefined,
          reason: reason.trim(),
          idempotencyKey,
        },
      );
      await apiClient.post(
        `/regularizations/${response.data.data.id}/approve`,
        { comment: `HR manual correction: ${reason.trim()}` },
      );
      onCreated(response.data.data.id);
    } catch (cause) {
      setError(correctionError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-zinc-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-correction-title"
    >
      <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-correction-title" className="text-xl font-bold">
              Correct attendance
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {employeeName} · {selectedDate}
            </p>
          </div>
          <button aria-label="Close correction dialog" onClick={onClose}>
            <span className="text-2xl text-on-surface-variant">×</span>
          </button>
        </div>
        <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-on-surface-variant">
          {data
            ? `Recorded: ${formatClock(data.firstCheckin)} to ${formatClock(data.lastCheckout)}. `
            : "No attendance was recorded for this day. "}
          Enter the correct check-in and checkout. Saving applies the correction
          immediately and records the reason in the audit history.
        </p>
        {error && (
          <div className="mt-4">
            <ErrorState message={error} />
          </div>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Corrected check-in">
            <input
              aria-label="Corrected check-in"
              className={inputClass}
              type="time"
              value={checkin}
              onChange={(event) => setCheckin(event.target.value)}
            />
          </Field>
          <Field label="Corrected checkout">
            <input
              aria-label="Corrected checkout"
              className={inputClass}
              type="time"
              value={checkout}
              onChange={(event) => setCheckout(event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Reason">
            <textarea
              aria-label="Correction reason"
              className={`${inputClass} h-24 py-3`}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="h-11 rounded-xl border border-zinc-300 px-5 text-sm font-semibold"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <PrimaryButton disabled={busy} onClick={submit}>
            {busy ? "Saving…" : "Save correction"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function correctedTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function correctionError(cause: unknown) {
  if (typeof cause !== "object" || cause === null || !("response" in cause))
    return "The correction could not be created.";
  const response = (cause as { response?: { data?: { message?: string } } })
    .response;
  return response?.data?.message ?? "The correction could not be created.";
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
              ? "bg-error-container text-error"
              : "bg-zinc-50 text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
        {!last && <span className="min-h-10 w-px flex-1 bg-zinc-200" />}
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
        <p className="mt-1 text-[10px] uppercase tracking-wide text-outline">
          {event.source}
          {event.isOfflineSync ? " · Offline sync" : ""}
        </p>
        {event.timeSuspect && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-error">
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
      <span className="text-[9px] uppercase text-outline">{label}</span>
    </div>
  );
}
