export type AttendanceStatus =
  | "PRESENT_OPEN"
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF"
  | "ON_DUTY"
  | "LATE"
  | "WORKING_DAY"
  | "UPCOMING"
  | "NOT_APPLICABLE";
import { tenantMessage } from "@/i18n/tenant-message";

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
    {
      label: string;
      className: string;
      dot: string;
      calendarBg: string;
      calendarFg: string;
    }
  > = {
    PRESENT_OPEN: {
      label: tenantMessage("Working"),
      className: "dashboard-tone dashboard-tone-emerald",
      dot: "status-dot status-dot-success",
      calendarBg: "var(--attendance-success-bg)",
      calendarFg: "var(--attendance-success-fg)",
    },
    PRESENT: {
      label: tenantMessage("Present"),
      className: "dashboard-tone dashboard-tone-emerald",
      dot: "status-dot status-dot-success",
      calendarBg: "var(--attendance-success-bg)",
      calendarFg: "var(--attendance-success-fg)",
    },
    HALF_DAY: {
      label: tenantMessage("Half day"),
      className: "dashboard-tone dashboard-tone-amber",
      dot: "status-dot status-dot-warning",
      calendarBg: "var(--attendance-warning-bg)",
      calendarFg: "var(--attendance-warning-fg)",
    },
    ABSENT: {
      label: tenantMessage("Absent"),
      className: "bg-error-container text-error",
      dot: "status-dot status-dot-danger",
      calendarBg: "var(--attendance-danger-bg)",
      calendarFg: "var(--attendance-danger-fg)",
    },
    ON_LEAVE: {
      label: tenantMessage("On leave"),
      className: "dashboard-tone dashboard-tone-blue",
      dot: "status-dot status-dot-info",
      calendarBg: "var(--attendance-info-bg)",
      calendarFg: "var(--attendance-info-fg)",
    },
    HOLIDAY: {
      label: tenantMessage("Holiday"),
      className: "dashboard-tone dashboard-tone-sky",
      dot: "status-dot status-dot-info",
      calendarBg: "var(--attendance-sky-bg)",
      calendarFg: "var(--attendance-sky-fg)",
    },
    WEEKLY_OFF: {
      label: tenantMessage("Weekly off"),
      className: "dashboard-tone dashboard-tone-neutral",
      dot: "status-dot status-dot-neutral",
      calendarBg: "var(--attendance-neutral-bg)",
      calendarFg: "var(--attendance-neutral-fg)",
    },
    ON_DUTY: {
      label: tenantMessage("On duty"),
      className: "dashboard-tone dashboard-tone-teal",
      dot: "status-dot status-dot-info",
      calendarBg: "var(--attendance-duty-bg)",
      calendarFg: "var(--attendance-duty-fg)",
    },
    LATE: {
      label: tenantMessage("Late"),
      className: "dashboard-tone dashboard-tone-amber",
      dot: "status-dot status-dot-warning",
      calendarBg: "var(--attendance-warning-bg)",
      calendarFg: "var(--attendance-warning-fg)",
    },
    WORKING_DAY: {
      label: tenantMessage("Working day"),
      className: "dashboard-tone dashboard-tone-neutral",
      dot: "status-dot status-dot-neutral",
      calendarBg: "var(--attendance-info-bg)",
      calendarFg: "var(--attendance-info-fg)",
    },
    UPCOMING: {
      label: tenantMessage("Scheduled"),
      className: "dashboard-tone dashboard-tone-neutral",
      dot: "status-dot status-dot-neutral",
      calendarBg: "var(--attendance-info-bg)",
      calendarFg: "var(--attendance-info-fg)",
    },
    NOT_APPLICABLE: {
      label: tenantMessage("Not applicable"),
      className: "dashboard-tone dashboard-tone-neutral",
      dot: "status-dot status-dot-neutral",
      calendarBg: "var(--attendance-neutral-bg)",
      calendarFg: "var(--attendance-neutral-fg)",
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
