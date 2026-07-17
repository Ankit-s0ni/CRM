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
      className: "bg-[#d8f8df] text-[#006e2d]",
      dot: "bg-[#00a642]",
    },
    PRESENT: {
      label: "Present",
      className: "bg-[#d8f8df] text-[#006e2d]",
      dot: "bg-[#00a642]",
    },
    HALF_DAY: {
      label: "Half day",
      className: "bg-[#ffddb0] text-[#895100]",
      dot: "bg-[#ef9d00]",
    },
    ABSENT: {
      label: "Absent",
      className: "bg-[#ffdad6] text-[#ba1a1a]",
      dot: "bg-[#d32f2f]",
    },
    ON_LEAVE: {
      label: "On leave",
      className: "bg-[#e3e0ff] text-[#3525cd]",
      dot: "bg-[#4f46e5]",
    },
    HOLIDAY: {
      label: "Holiday",
      className: "bg-[#cbe6ff] text-[#006492]",
      dot: "bg-[#0086c4]",
    },
    WEEKLY_OFF: {
      label: "Weekly off",
      className: "bg-[#ece9f2] text-[#646273]",
      dot: "bg-[#aaa3ad]",
    },
    ON_DUTY: {
      label: "On duty",
      className: "bg-[#d9f1ff] text-[#005f79]",
      dot: "bg-[#0091b3]",
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
