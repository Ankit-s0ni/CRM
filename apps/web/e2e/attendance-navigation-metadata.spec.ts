import { expect, test } from "@playwright/test";
import { attendanceHelp } from "../src/content/attendance-help";
import {
  attendanceBreadcrumbs,
  attendanceHelpKeyForPath,
  attendanceRouteAccessForPath,
  attendanceSectionForPath,
  attendanceSectionTabs,
  attendanceSetupFeatureTabs,
  attendanceWorkspaceItems,
  canAccessAttendanceWorkspace,
  canUseAttendanceRoute,
  type AttendanceCapabilities,
} from "../src/lib/attendance-navigation";

const fieldCapabilities: AttendanceCapabilities = {
  attendanceEntitled: true,
  fieldTrackingEntitled: true,
  fieldTrackingEnabled: true,
  fieldTrackingRelevant: true,
  biometricEnforcementAvailable: true,
};

const officeCapabilities: AttendanceCapabilities = {
  attendanceEntitled: true,
  fieldTrackingEntitled: false,
  fieldTrackingEnabled: false,
  fieldTrackingRelevant: false,
  biometricEnforcementAvailable: false,
};

const declaredRoutes = new Set([
  ...attendanceWorkspaceItems.map(({ href }) => href),
  ...Object.values(attendanceSectionTabs)
    .flatMap((items) => items ?? [])
    .map(({ href }) => href),
  ...attendanceSetupFeatureTabs.flat().map(({ href }) => href),
]);

test("keeps every Attendance route connected to typed contextual help", () => {
  const routeItems = [
    ...attendanceWorkspaceItems,
    ...Object.values(attendanceSectionTabs).flatMap((items) => items ?? []),
    ...attendanceSetupFeatureTabs.flat(),
  ];

  for (const item of routeItems) {
    expect(attendanceHelp[item.helpKey], item.href).toBeDefined();
    expect(item.permissions.length, item.href).toBeGreaterThan(0);
  }

  expect(Object.keys(attendanceHelp)).toHaveLength(26);
  for (const entry of Object.values(attendanceHelp)) {
    expect(entry.title, entry.key).not.toBe("");
    expect(entry.summary, entry.key).not.toBe("");
    expect(entry.useWhen, entry.key).not.toBe("");
    expect(entry.steps.length, entry.key).toBeGreaterThan(0);
    expect(JSON.stringify(entry), entry.key).not.toMatch(
      /attendance\.[a-z.-]+/i,
    );
    expect(JSON.stringify(entry), entry.key).not.toMatch(
      /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
    );
    for (const related of entry.related ?? []) {
      expect(declaredRoutes.has(related.href), related.href).toBe(true);
    }
  }
});

test("maps every preserved route to its workspace, help, and breadcrumb", () => {
  const routes = [
    ["/app/modules/attendance", "overview", "overview", "Attendance"],
    ["/app/attendance/register", "today", "register", "Today"],
    [
      "/app/attendance/register/employee-1",
      "today",
      "register-detail",
      "Employee day",
    ],
    ["/app/attendance/requests", "requests", "requests", "Leave"],
    ["/app/attendance/leave/requests", "requests", "requests", "Leave"],
    ["/app/attendance/leave/approvals", "requests", "requests", "Leave"],
    ["/app/attendance/leave/balances", "requests", "requests", "Leave"],
    ["/app/attendance/exceptions", "requests", "exceptions", "Leave"],
    [
      "/app/attendance/regularizations",
      "requests",
      "regularizations",
      "Leave",
    ],
    [
      "/app/attendance/regularizations/request-1",
      "requests",
      "regularization-detail",
      "Correction decision",
    ],
    ["/app/attendance/field", "field", "field", "Field"],
    [
      "/app/attendance/field/employee-1/route",
      "field",
      "field-route",
      "Route history",
    ],
    ["/app/attendance/reports", "reports", "reports", "Reports"],
    ["/app/attendance/payroll", "reports", "payroll-close", "Reports"],
    ["/app/attendance/setup", "setup", "setup", "Setup"],
    ["/app/settings/attendance", "setup", "attendance-defaults", "Setup"],
    ["/app/modules/attendance/capabilities", "setup", "app-behavior", "Setup"],
    ["/app/attendance/policies", "setup", "policies", "Setup"],
    ["/app/attendance/shifts", "setup", "shifts", "Setup"],
    ["/app/attendance/rosters", "setup", "rosters", "Setup"],
    ["/app/attendance/offices", "setup", "offices", "Setup"],
    ["/app/attendance/holidays", "setup", "holidays", "Setup"],
    ["/app/attendance/devices", "setup", "devices", "Setup"],
    ["/app/attendance/security", "setup", "security-feed", "Setup"],
  ] as const;

  for (const [path, section, helpKey, finalCrumb] of routes) {
    expect(attendanceSectionForPath(path), path).toBe(section);
    expect(attendanceHelpKeyForPath(path), path).toBe(helpKey);
    expect(attendanceRouteAccessForPath(path), path).not.toBeNull();
    expect(attendanceBreadcrumbs(path).at(-1)?.label, path).toBe(finalCrumb);
  }
});

test("filters workspace routes by permission and tenant capability", () => {
  const employee = new Set(["attendance.records.self.read"]);
  const manager = new Set([
    "attendance.records.read",
    "attendance.exceptions.read",
  ]);
  const fieldManager = new Set([
    "attendance.records.read",
    "attendance.approvals.manage",
    "attendance.field.live.read",
  ]);
  const configAdmin = new Set(["attendance.config.manage"]);

  expect(canAccessAttendanceWorkspace(employee)).toBe(false);
  expect(canAccessAttendanceWorkspace(manager)).toBe(true);

  const permittedForManager = attendanceWorkspaceItems
    .filter((item) => canUseAttendanceRoute(item, manager, officeCapabilities))
    .map(({ section }) => section);
  expect(permittedForManager).toEqual(["overview", "today", "requests"]);

  const permittedForFieldManager = attendanceWorkspaceItems
    .filter((item) =>
      canUseAttendanceRoute(item, fieldManager, fieldCapabilities),
    )
    .map(({ section }) => section);
  expect(permittedForFieldManager).toEqual([
    "overview",
    "today",
    "requests",
    "field",
  ]);

  const field = attendanceWorkspaceItems.find(
    ({ section }) => section === "field",
  )!;
  expect(canUseAttendanceRoute(field, fieldManager, officeCapabilities)).toBe(
    false,
  );
  expect(canUseAttendanceRoute(field, fieldManager, fieldCapabilities)).toBe(
    true,
  );
  expect(
    canUseAttendanceRoute(field, fieldManager, {
      ...fieldCapabilities,
      fieldTrackingRelevant: false,
    }),
  ).toBe(false);
  expect(canUseAttendanceRoute(field, configAdmin, fieldCapabilities)).toBe(
    false,
  );
  expect(
    canUseAttendanceRoute(field, fieldManager, {
      ...fieldCapabilities,
      attendanceEntitled: false,
    }),
  ).toBe(false);
});
