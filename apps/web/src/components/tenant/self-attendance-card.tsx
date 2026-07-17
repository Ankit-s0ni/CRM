"use client";

import { Coffee, LogIn, LogOut, TimerReset } from "lucide-react";
import type { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  formatMinutes,
  statusTone,
  type AttendanceStatus,
  type AttendanceTimelineEvent,
} from "./attendance-runtime-types";

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
      else setError("Your attendance state could not be loaded.");
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
        else setError("Your attendance state could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allowed, onUnavailable]);

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
          "This attendance action could not be completed.",
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
          "animate-pulse rounded-2xl bg-[#eeeaf7]",
          compact ? "h-24" : "h-48",
        )}
      />
    );
  if (!today)
    return error ? (
      <div className="rounded-xl border border-[#ffb4ab] bg-[#ffdad6] p-4 text-sm text-[#93000a]">
        {error}
      </div>
    ) : null;
  const tone = statusTone(today.status);
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
      ? "Check in"
      : today.openAction === "BREAK_END"
        ? "End break"
        : "Check out";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#ddd8f0] bg-white shadow-sm",
        compact ? "p-4" : "p-5",
      )}
      aria-label="My attendance"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-11 place-items-center rounded-xl bg-[#ece9ff] text-[#3525cd]">
          <TimerReset className="size-5" />
        </div>
        <div className="min-w-36 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">My attendance</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                tone.className,
              )}
            >
              {tone.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#777587]">
            {today.shift
              ? `${today.shift.name ?? "Shift"} · ${today.shift.startTime}–${today.shift.endTime}`
              : today.timezone}
          </p>
        </div>
        <div className="flex gap-5 text-center">
          <div>
            <strong className="block text-lg">
              {formatMinutes(today.totals.workMinutes)}
            </strong>
            <span className="text-[10px] uppercase text-[#777587]">Worked</span>
          </div>
          <div>
            <strong className="block text-lg">
              {formatMinutes(today.totals.breakMinutes)}
            </strong>
            <span className="text-[10px] uppercase text-[#777587]">Break</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy || today.isLocked}
            onClick={() => punch(primaryAction)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            <PrimaryIcon className="size-4" />
            {busy ? "Saving…" : label}
          </button>
          {today.canStartBreak && (
            <button
              disabled={busy || today.isLocked}
              onClick={() => punch("break-start")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#c7c4d8] px-4 text-sm font-semibold text-[#3525cd]"
            >
              <Coffee className="size-4" />
              Break
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-[#ffdad6] p-3 text-xs text-[#93000a]">
          {error}
        </p>
      )}
    </section>
  );
}
