export type AttendanceHelpKey =
  | "overview"
  | "register"
  | "register-detail"
  | "requests"
  | "exceptions"
  | "regularizations"
  | "regularization-detail"
  | "field"
  | "field-route"
  | "reports"
  | "payroll-close"
  | "setup"
  | "attendance-defaults"
  | "app-behavior"
  | "policies"
  | "shifts"
  | "rosters"
  | "offices"
  | "holidays"
  | "devices"
  | "security-feed"
  | "selfie-verification"
  | "location-verification"
  | "background-tracking"
  | "weekly-off"
  | "payroll-lock";

export type AttendanceHelpEntry = {
  key: AttendanceHelpKey;
  title: string;
  summary: string;
  useWhen: string;
  steps: readonly string[];
  effect?: string;
  access?: string;
  dependencies?: readonly string[];
  related?: readonly { label: string; href: string }[];
};

const entries: readonly AttendanceHelpEntry[] = [
  help(
    "overview",
    "Attendance overview",
    "See today\'s attendance health, urgent queues, setup gaps and month-end readiness in one place.",
    "Start here at the beginning of an HR shift or before payroll close.",
    [
      "Choose the date and scope.",
      "Review the Needs attention queue.",
      "Open a metric to continue with its filtered workflow.",
    ],
    "This page is read-only; actions happen in the linked workspace.",
    "HR, Business Admin and permitted managers",
  ),
  help(
    "register",
    "Attendance register",
    "Review employee-by-employee attendance status for a selected day.",
    "You need to find present, absent, late, incomplete or exception records.",
    [
      "Select date and scope.",
      "Filter by status or search an employee.",
      "Open an employee row for punch evidence and day details.",
    ],
    "Register data is calculated from punches, shifts, policies, exceptions and approved leave.",
    "Users with attendance record access",
    [{ label: "Requests", href: "/app/attendance/requests" }],
  ),
  help(
    "register-detail",
    "Employee attendance detail",
    "Inspect the punches, verification evidence and calculation for one employee day.",
    "A register result needs investigation or an employee questions the outcome.",
    [
      "Check the applied shift and policy.",
      "Compare punch times and verification results.",
      "Use the linked request workflow if a correction is required.",
    ],
    "Direct edits are avoided; approved requests create an auditable recomputation.",
    "Scoped HR or manager access",
  ),
  help(
    "requests",
    "Attendance requests",
    "Review OD/WFH exceptions and employee attendance corrections from one queue.",
    "Employees or managers have submitted attendance changes requiring review.",
    [
      "Choose OD & WFH or Corrections.",
      "Filter pending items by age and scope.",
      "Open a request and record an auditable decision.",
    ],
    "Approved items can change calculated attendance unless the payroll period is locked.",
    "HR, authorized managers and Business Admin",
  ),
  help(
    "exceptions",
    "OD & WFH requests",
    "Review on-duty and work-from-home attendance exceptions.",
    "An employee worked outside the normal office or schedule and needs an approved exception.",
    [
      "Open a pending request.",
      "Validate dates, reason and reporting scope.",
      "Approve or reject with a comment.",
    ],
    "Approved exceptions participate in attendance calculation.",
    "Users with attendance exception access",
  ),
  help(
    "regularizations",
    "Attendance corrections",
    "Resolve missing or incorrect punch requests without editing history directly.",
    "An employee submitted a correction for check-in, checkout or an incomplete day.",
    [
      "Open the oldest pending request.",
      "Compare immutable evidence with the requested time.",
      "Approve or reject with an audit comment.",
    ],
    "Approval recomputes the day; locked payroll periods reject changes.",
    "HR or attendance correction managers",
    [{ label: "Payroll close", href: "/app/attendance/payroll" }],
  ),
  help(
    "regularization-detail",
    "Correction decision",
    "Compare original attendance evidence with the requested correction before deciding.",
    "You are responsible for a specific pending correction.",
    [
      "Review original and requested times.",
      "Confirm the employee and reporting scope.",
      "Enter a clear audit comment and approve or reject.",
    ],
    "Approval is final and may change attendance/payroll inputs; a locked period cannot be changed.",
    "Authorized correction approvers",
  ),
  help(
    "field",
    "Field operations",
    "Monitor active field employees, stale sessions and route status on the live map.",
    "The tenant uses field attendance and HR needs operational visibility.",
    [
      "Filter live, stale or offline employees.",
      "Open an employee for route history.",
      "Follow up on stale sessions without exposing location unnecessarily.",
    ],
    "Field visibility is policy-driven and raw pings follow the approved retention period.",
    "Users with field monitoring access",
    undefined,
    ["Field Tracking entitlement", "An active eligible field policy"],
  ),
  help(
    "field-route",
    "Field route history",
    "Review privacy-safe route evidence for one employee and field session.",
    "A visit, attendance event or stale field session needs investigation.",
    [
      "Confirm employee and session period.",
      "Review ordered pings and gaps.",
      "Use attendance/security workflows for follow-up.",
    ],
    "Route access is audited and should be limited to a legitimate work purpose.",
    "Users with field route access",
  ),
  help(
    "reports",
    "Reports center",
    "Generate reproducible attendance, payroll, late/OT, security and field-distance exports.",
    "HR needs a period snapshot for review, payroll or compliance.",
    [
      "Choose report type and period.",
      "Apply only required filters.",
      "Generate, wait for completion and download before the signed link expires.",
    ],
    "Each export stores its filter contract, data cutoff and checksum.",
    "Users with attendance report access",
    [{ label: "Payroll close", href: "/app/attendance/payroll" }],
  ),
  help(
    "payroll-close",
    "Payroll close",
    "Lock a finalized month against a completed payroll export and preserve reopen history.",
    "The payroll report has been checked and no further attendance changes should be allowed.",
    [
      "Select the completed payroll export.",
      "Confirm the period and impact.",
      "Lock the month; reopen only with an auditable reason.",
    ],
    "A lock blocks corrections and leave changes that affect the period.",
    "Payroll-lock administrators",
    undefined,
    ["A completed matching payroll export"],
  ),
  help(
    "setup",
    "Attendance setup",
    "Configure rules, schedules, workplaces and trust controls in a guided workspace.",
    "Attendance is being launched, a policy changes, or setup health shows a gap.",
    [
      "Start with Rules & verification.",
      "Configure schedules and workplaces.",
      "Finish device/security controls and review setup health.",
    ],
    "Changes can alter employee mobile permissions and future attendance calculations.",
    "HR and Business Admin according to permission",
  ),
  help(
    "attendance-defaults",
    "Attendance defaults",
    "Set tenant-wide working hours, weekly offs and default verification behavior.",
    "You need a safe baseline before assigning more specific policies.",
    [
      "Confirm timezone and workday times.",
      "Configure weekly-off rules.",
      "Save and review policy-specific overrides.",
    ],
    "Defaults affect employees without a more specific assigned policy.",
    "Attendance configuration administrators",
    [{ label: "Policies", href: "/app/attendance/policies" }],
  ),
  help(
    "app-behavior",
    "Employee app behavior",
    "Control which attendance capabilities and permissions the employee app exposes.",
    "The company wants location-only, selfie, device trust or field tracking behavior to change.",
    [
      "Review licensed capabilities.",
      "Enable only required behavior.",
      "Save and verify an office-only and field employee runtime.",
    ],
    "The employee app dynamically hides irrelevant features and requests only policy-required permissions.",
    "Attendance configuration administrators",
  ),
  help(
    "policies",
    "Attendance policies",
    "Define calculation and verification rules and assign them by tenant, department or employee.",
    "Different employee groups need different attendance rules.",
    [
      "Create or select a policy.",
      "Configure time, location, selfie and device rules.",
      "Assign scope and verify conflicts before saving.",
    ],
    "The most specific active assignment controls employee attendance runtime.",
    "Policy administrators",
  ),
  help(
    "shifts",
    "Shifts",
    "Define reusable start/end times, breaks and grace windows.",
    "Employees work schedules that differ from the tenant default.",
    [
      "Create a clearly named shift.",
      "Set times and overnight behavior.",
      "Assign it to employees through the roster planner.",
    ],
    "Shifts influence lateness, work duration, overtime and absence calculation.",
    "Shift administrators",
    [{ label: "Rosters", href: "/app/attendance/rosters" }],
  ),
  help(
    "rosters",
    "Rosters",
    "Assign employee shifts for a date range with conflict-safe scheduling.",
    "Schedules rotate or vary by employee and week.",
    [
      "Choose period and employees.",
      "Assign shifts and resolve conflicts.",
      "Review the resulting dates before leaving the planner.",
    ],
    "Saved roster assignments become authoritative for attendance calculation immediately.",
    "Roster administrators",
    undefined,
    ["At least one active shift"],
  ),
  help(
    "offices",
    "Offices and geofences",
    "Manage work locations and approved attendance boundaries.",
    "A policy uses office geofence verification.",
    [
      "Create the office and timezone.",
      "Place the map center and radius accurately.",
      "Test at the physical boundary before assigning policies.",
    ],
    "Location-only punches are accepted or rejected against the assigned office boundary.",
    "Office administrators",
  ),
  help(
    "holidays",
    "Holiday calendars",
    "Define non-working dates for the relevant location or workforce scope.",
    "A public, company or regional holiday must change attendance expectations.",
    [
      "Select the calendar and year.",
      "Add date, name and scope.",
      "Check affected rosters before publishing.",
    ],
    "Holidays affect expected workdays, absence and leave calculations.",
    "Holiday administrators",
  ),
  help(
    "devices",
    "Employee devices",
    "Approve, block or replace devices registered for attendance.",
    "A new device is pending, a phone is replaced, or trust is compromised.",
    [
      "Filter pending or blocked devices.",
      "Verify employee and device details.",
      "Approve, block or replace with an auditable reason.",
    ],
    "Blocked devices cannot submit trusted attendance events.",
    "Device trust administrators",
  ),
  help(
    "security-feed",
    "Security feed",
    "Investigate device, location, biometric and verification risk signals.",
    "A punch was rejected or a security rule generated an alert.",
    [
      "Prioritize high-severity unresolved alerts.",
      "Review linked employee, device and attendance context.",
      "Acknowledge or resolve with a safe audit note.",
    ],
    "Resolving an alert does not rewrite the original verification evidence.",
    "Security-monitoring users",
  ),
  help(
    "selfie-verification",
    "Selfie and face verification",
    "Require a selfie or server-side face match for selected attendance policies.",
    "Identity assurance is required in addition to location/device checks.",
    [
      "Confirm legal consent and provider readiness.",
      "Choose selfie or face-match mode in the policy.",
      "Pilot enrollment and fallback states before broad assignment.",
    ],
    "The mobile app requests camera/consent only for employees whose active policy requires it.",
    "Policy and biometric administrators",
  ),
  help(
    "location-verification",
    "Location verification",
    "Choose whether punches require an office geofence, field location or no location check.",
    "The company needs location assurance appropriate to each workforce group.",
    [
      "Choose the least intrusive valid mode.",
      "Assign an accurate office or field policy.",
      "Test accepted and rejected boundary cases.",
    ],
    "The mobile app requests location only when the active policy requires it.",
    "Policy administrators",
  ),
  help(
    "background-tracking",
    "Background field tracking",
    "Capture scheduled location pings only during an active eligible field session.",
    "Field operations require route or visit evidence while the app is minimized.",
    [
      "Confirm FIELD_TRACKING entitlement.",
      "Enable field tracking in capabilities and policy.",
      "Explain permission/retention, then test start and stop behavior.",
    ],
    "Office-only users never receive this feature or its background-location prompt.",
    "Field configuration administrators",
  ),
  help(
    "weekly-off",
    "Weekly-off rules",
    "Define recurring non-working weekdays and ordinal patterns for regional schedules.",
    "The workforce uses Friday/Saturday, Sunday, alternate Saturdays or another recurring pattern.",
    [
      "Choose the affected weekdays.",
      "Add ordinal rules only when needed.",
      "Preview dates before saving.",
    ],
    "Weekly offs change expected workdays, absence and leave calculations.",
    "Attendance configuration administrators",
  ),
  help(
    "payroll-lock",
    "Payroll lock",
    "Prevent attendance-changing actions after a payroll period is finalized.",
    "A completed payroll export has been approved for processing.",
    [
      "Verify the export and period.",
      "Lock with the required confirmation.",
      "Reopen only when correction is authorized and documented.",
    ],
    "Locked dates reject regularization, leave and recomputation mutations.",
    "Payroll-lock administrators",
  ),
];

export const attendanceHelp = Object.freeze(
  Object.fromEntries(entries.map((entry) => [entry.key, entry])) as Record<
    AttendanceHelpKey,
    AttendanceHelpEntry
  >,
);

export function attendanceHelpEntry(key: AttendanceHelpKey) {
  return attendanceHelp[key];
}

function help(
  key: AttendanceHelpKey,
  title: string,
  summary: string,
  useWhen: string,
  steps: readonly string[],
  effect?: string,
  access?: string,
  related?: readonly { label: string; href: string }[],
  dependencies?: readonly string[],
): AttendanceHelpEntry {
  return {
    key,
    title,
    summary,
    useWhen,
    steps,
    effect,
    access,
    related,
    dependencies,
  };
}
