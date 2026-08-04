"use client";

import { Coffee, LogIn, LogOut, TimerReset } from "lucide-react";
import type { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization as useLocalization } from "@/lib/tenant-localization";
import { cn } from "@/lib/utils";
import {
  statusTone,
  type AttendanceStatus,
  type AttendanceTimelineEvent,
} from "@/features/products/attendance/core/attendance-runtime-types";

type Today = {
  attendanceDate: string;
  timezone: string;
  status: AttendanceStatus;
  openAction: "CHECKIN" | "CHECKOUT" | "BREAK_END";
  canStartBreak: boolean;
  isLocked: boolean;
  totals: {
    workMinutes: number;
    breakMinutes: number;
    overtimeMinutes: number;
  };
  shift: { name?: string; startTime: string; endTime: string } | null;
  timeline: AttendanceTimelineEvent[];
};

export function SelfAttendanceCard({
  compact = false,
  onUnavailable,
}: {
  compact?: boolean;
  onUnavailable?: () => void;
}) {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const { formatNumber, t } = useLocalization();
  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const allowed = permissions.includes("attendance.records.self.read");

  async function load() {
    if (!allowed) return;
    try {
      const response = await apiClient.get<{ data: Today }>(
        "/attendance/me/today",
      );
      setToday(response.data.data);
      setError("");
    } catch (requestError) {
      const apiError = requestError as AxiosError;
      if ([403, 404].includes(apiError.response?.status ?? 0))
        onUnavailable?.();
      else
        setError(
          t(
            "errors.attendance.selfLoadFailed",
            "Your attendance state could not be loaded.",
          ),
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    apiClient
      .get<{ data: Today }>("/attendance/me/today")
      .then(({ data }) => {
        if (active) {
          setToday(data.data);
          setError("");
        }
      })
      .catch((requestError: unknown) => {
        const apiError = requestError as AxiosError;
        if (!active) return;
        if ([403, 404].includes(apiError.response?.status ?? 0))
          onUnavailable?.();
        else
          setError(
            t(
              "errors.attendance.selfLoadFailed",
              "Your attendance state could not be loaded.",
            ),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, onUnavailable, t]);

  async function punch(
    action: "check-in" | "check-out" | "break-start" | "break-end",
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await apiClient.post<{ data: Today }>(
        `/attendance/${action}`,
        { requestId: crypto.randomUUID() },
      );
      setToday(response.data.data);
    } catch (requestError) {
      const apiError = requestError as AxiosError<{ message?: string }>;
      setError(
        apiError.response?.data?.message ??
          t(
            "errors.attendance.actionFailed",
            "This attendance action could not be completed.",
          ),
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!allowed || (!loading && !today && !error)) return null;
  if (loading)
    return (
      <div
        className={cn(
          "animate-pulse rounded-2xl bg-zinc-100",
          compact ? "h-24" : "h-48",
        )}
      />
    );
  if (!today)
    return error ? (
      <div className="rounded-xl border border-red-300 bg-error-container p-4 text-sm text-on-error-container">
        {error}
      </div>
    ) : null;
  const tone = statusTone(today.status);
  const statusLabel = t(
    attendanceStatusKey(today.status),
    tone.label,
  );
  const primaryAction =
    today.openAction === "CHECKIN"
      ? "check-in"
      : today.openAction === "BREAK_END"
        ? "break-end"
        : "check-out";
  const PrimaryIcon =
    today.openAction === "CHECKIN"
      ? LogIn
      : today.openAction === "BREAK_END"
        ? TimerReset
        : LogOut;
  const label =
    today.openAction === "CHECKIN"
      ? t("attendance.self.checkIn", "Check in")
      : today.openAction === "BREAK_END"
        ? t("attendance.self.endBreak", "End break")
        : t("attendance.self.checkOut", "Check out");
  const formatDuration = (value: number) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return hours
      ? t("attendance.self.durationHours", "{hours}h {minutes}m", {
          hours: formatNumber(hours),
          minutes: formatNumber(minutes),
        })
      : t("attendance.self.durationMinutes", "{minutes}m", {
          minutes: formatNumber(minutes),
        });
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm",
        compact ? "p-4" : "p-5",
      )}
      aria-label={t("attendance.self.title", "My attendance")}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-11 place-items-center rounded-xl bg-zinc-50 text-[#151515]">
          <TimerReset className="size-5" />
        </div>
        <div className="min-w-36 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">
              {t("attendance.self.title", "My attendance")}
            </h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                tone.className,
              )}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-outline">
            {today.shift
              ? `${today.shift.name ?? t("attendance.self.shift", "Shift")} · ${today.shift.startTime}–${today.shift.endTime}`
              : today.timezone}
          </p>
        </div>
        <div className="flex gap-5 text-center">
          <div>
            <strong className="block text-lg">
              {formatDuration(today.totals.workMinutes)}
            </strong>
            <span className="text-[10px] uppercase text-outline">
              {t("attendance.self.worked", "Worked")}
            </span>
          </div>
          <div>
            <strong className="block text-lg">
              {formatDuration(today.totals.breakMinutes)}
            </strong>
            <span className="text-[10px] uppercase text-outline">
              {t("attendance.self.break", "Break")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy || today.isLocked}
            onClick={() => punch(primaryAction)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#151515] px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            <PrimaryIcon className="size-4" />
            {busy ? t("common.state.saving", "Saving...") : label}
          </button>
          {today.canStartBreak && (
            <button
              disabled={busy || today.isLocked}
              onClick={() => punch("break-start")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-[#151515]"
            >
              <Coffee className="size-4" />
              {t("attendance.self.startBreak", "Start break")}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-error-container p-3 text-xs text-on-error-container">
          {error}
        </p>
      )}
    </section>
  );
}

function attendanceStatusKey(status: AttendanceStatus) {
  const keys: Record<AttendanceStatus, string> = {
    PRESENT_OPEN: "attendance.status.working",
    PRESENT: "attendance.status.present",
    HALF_DAY: "attendance.status.halfDay",
    ABSENT: "attendance.status.absent",
    ON_LEAVE: "attendance.status.onLeave",
    HOLIDAY: "attendance.status.holiday",
    WEEKLY_OFF: "attendance.status.weeklyOff",
    ON_DUTY: "attendance.status.onDuty",
    LATE: "attendance.status.late",
    WORKING_DAY: "attendance.status.workingDay",
    UPCOMING: "attendance.status.scheduled",
    NOT_APPLICABLE: "attendance.status.notApplicable",
  };
  return keys[status];
}
