export type AttendanceStatus =
  | "PRESENT_OPEN"
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF"
  | "ON_DUTY";

export type AttendanceTimelineEvent = {
  id: string;
  eventType: string;
  source: "WEB" | "MOBILE" | "OFFLINE" | "REGULARIZED";
  eventTime: string;
  syncTime: string;
  isOfflineSync: boolean;
  timeSuspect: boolean;
};

export type RegisterRow = {
  id: string;
  attendanceDate: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    department: { id: string; name: string };
    designation: { id: string; name: string } | null;
    office: { id: string; officeName: string } | null;
  };
  shift: { id: string; name: string } | null;
  status: AttendanceStatus;
  firstCheckin: string | null;
  lastCheckout: string | null;
  workMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
  isLocked: boolean;
  evidence: {
    verification: { passed: number; failed: number };
    sources: string[];
    hasOfflineSync: boolean;
    timeSuspect: boolean;
  };
};

export type AttendanceDay = {
  id: string;
  date: string;
  status: AttendanceStatus;
  firstCheckin: string | null;
  lastCheckout: string | null;
  workMinutes: number;
  breakMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
  shift: { id: string; name: string } | null;
  finalizedAt: string | null;
  lockedAt: string | null;
};

export function statusTone(status: AttendanceStatus) {
  const values: Record<
    AttendanceStatus,
    { label: string; className: string; dot: string }
  > = {
    PRESENT_OPEN: {
      label: "Working",
      className: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-600",
    },
    PRESENT: {
      label: "Present",
      className: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-600",
    },
    HALF_DAY: {
      label: "Half day",
      className: "bg-amber-200 text-amber-800",
      dot: "bg-amber-500",
    },
    ABSENT: {
      label: "Absent",
      className: "bg-error-container text-error",
      dot: "bg-red-600",
    },
    ON_LEAVE: {
      label: "On leave",
      className: "bg-zinc-100 text-primary",
      dot: "bg-primary-container",
    },
    HOLIDAY: {
      label: "Holiday",
      className: "bg-sky-200 text-sky-700",
      dot: "bg-sky-600",
    },
    WEEKLY_OFF: {
      label: "Weekly off",
      className: "bg-zinc-100 text-on-surface-variant",
      dot: "bg-zinc-400",
    },
    ON_DUTY: {
      label: "On duty",
      className: "bg-sky-100 text-cyan-800",
      dot: "bg-cyan-600",
    },
  };
  return values[status];
}

export function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return hours
    ? `${hours}h ${minutes.toString().padStart(2, "0")}m`
    : `${minutes}m`;
}

export function formatClock(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function localIsoDate(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
