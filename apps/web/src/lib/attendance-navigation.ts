import type { AttendanceHelpKey } from "@/content/attendance-help";

export type AttendanceCapabilities = {
  attendanceEntitled: boolean;
  fieldTrackingEntitled: boolean;
  fieldTrackingEnabled: boolean;
  fieldTrackingRelevant: boolean;
  biometricEnforcementAvailable: boolean;
};

export type AttendanceRouteItem = {
  label: string;
  href: string;
  helpKey: AttendanceHelpKey;
  permissions: readonly string[];
  requiresField?: boolean;
};

export type AttendanceSection =
  "overview" | "today" | "requests" | "field" | "reports" | "setup";

export const attendanceWorkspaceAccessPermissions = [
  "attendance.records.read",
  "attendance.exceptions.read",
  "attendance.regularizations.manage",
  "attendance.approvals.manage",
  "attendance.field.live.read",
  "attendance.field.routes.read",
  "attendance.reports.read",
  "attendance.reports.generate",
  "attendance.payroll-lock.manage",
  "attendance.config.read",
  "attendance.config.manage",
  "attendance.policies.read",
  "attendance.policies.manage",
  "attendance.shifts.read",
  "attendance.shifts.manage",
  "attendance.rosters.read",
  "attendance.rosters.manage",
  "attendance.offices.read",
  "attendance.offices.manage",
  "attendance.holidays.read",
  "attendance.holidays.manage",
  "attendance.devices.read",
  "attendance.devices.manage",
  "attendance.security-alerts.read",
  "attendance.security-alerts.manage",
  "leave.self",
  "leave.approve",
  "leave.manage",
] as const;

export const attendanceWorkspaceItems: readonly (AttendanceRouteItem & {
  section: AttendanceSection;
})[] = [
  {
    section: "overview",
    label: "Overview",
    href: "/app/modules/attendance",
    helpKey: "overview",
    permissions: attendanceWorkspaceAccessPermissions,
  },
  {
    section: "today",
    label: "Today",
    href: "/app/attendance/register",
    helpKey: "register",
    permissions: ["attendance.records.read"],
  },
  {
    section: "requests",
    label: "Leave",
    href: "/app/attendance/requests",
    helpKey: "requests",
    permissions: [
      "attendance.exceptions.read",
      "attendance.regularizations.manage",
      "attendance.approvals.manage",
    ],
  },
  {
    section: "field",
    label: "Field",
    href: "/app/attendance/field",
    helpKey: "field",
    permissions: [
      "attendance.field.live.read",
      "attendance.field.routes.read",
    ],
    requiresField: true,
  },
  {
    section: "reports",
    label: "Reports",
    href: "/app/attendance/reports",
    helpKey: "reports",
    permissions: [
      "attendance.reports.read",
      "attendance.reports.generate",
      "attendance.payroll-lock.manage",
    ],
  },
  {
    section: "setup",
    label: "Setup",
    href: "/app/attendance/setup",
    helpKey: "setup",
    permissions: [
      "attendance.config.read",
      "attendance.config.manage",
      "attendance.policies.read",
      "attendance.policies.manage",
      "attendance.shifts.read",
      "attendance.shifts.manage",
      "attendance.rosters.read",
      "attendance.rosters.manage",
      "attendance.offices.read",
      "attendance.offices.manage",
      "attendance.holidays.read",
      "attendance.holidays.manage",
      "attendance.devices.read",
      "attendance.devices.manage",
      "attendance.security-alerts.read",
      "attendance.security-alerts.manage",
    ],
  },
] as const;

export const attendanceSectionTabs: Readonly<
  Partial<Record<AttendanceSection, readonly AttendanceRouteItem[]>>
> = {
  requests: [
    {
      label: "Leave",
      href: "/app/attendance/leave/requests",
      helpKey: "requests",
      permissions: ["leave.self", "leave.approve", "leave.manage"],
    },
    {
      label: "OD & WFH",
      href: "/app/attendance/exceptions",
      helpKey: "exceptions",
      permissions: ["attendance.exceptions.read"],
    },
    {
      label: "Corrections",
      href: "/app/attendance/regularizations",
      helpKey: "regularizations",
      permissions: [
        "attendance.regularizations.manage",
        "attendance.approvals.manage",
      ],
    },
  ],
  reports: [
    {
      label: "Reports center",
      href: "/app/attendance/reports",
      helpKey: "reports",
      permissions: ["attendance.reports.read", "attendance.reports.generate"],
    },
    {
      label: "Payroll close",
      href: "/app/attendance/payroll",
      helpKey: "payroll-close",
      permissions: ["attendance.payroll-lock.manage"],
    },
  ],
  setup: [
    {
      label: "Setup home",
      href: "/app/attendance/setup",
      helpKey: "setup",
      permissions: attendanceWorkspaceItems.find(
        ({ section }) => section === "setup",
      )!.permissions,
    },
    {
      label: "Rules",
      href: "/app/attendance/policies",
      helpKey: "policies",
      permissions: ["attendance.policies.read", "attendance.policies.manage"],
    },
    {
      label: "Schedule",
      href: "/app/attendance/shifts",
      helpKey: "shifts",
      permissions: [
        "attendance.shifts.read",
        "attendance.shifts.manage",
        "attendance.rosters.read",
        "attendance.rosters.manage",
      ],
    },
    {
      label: "Workplaces",
      href: "/app/attendance/offices",
      helpKey: "offices",
      permissions: [
        "attendance.offices.read",
        "attendance.offices.manage",
        "attendance.holidays.read",
        "attendance.holidays.manage",
      ],
    },
    {
      label: "Trust",
      href: "/app/attendance/devices",
      helpKey: "devices",
      permissions: [
        "attendance.devices.read",
        "attendance.devices.manage",
        "attendance.security-alerts.read",
        "attendance.security-alerts.manage",
      ],
    },
    {
      label: "Leave",
      href: "/app/attendance/setup/leave",
      helpKey: "setup",
      permissions: ["leave.manage"],
    },
  ],
};

export const attendanceSetupFeatureTabs: readonly (readonly AttendanceRouteItem[])[] =
  [
    [
      {
        label: "Shifts",
        href: "/app/attendance/shifts",
        helpKey: "shifts",
        permissions: ["attendance.shifts.read", "attendance.shifts.manage"],
      },
      {
        label: "Rosters",
        href: "/app/attendance/rosters",
        helpKey: "rosters",
        permissions: ["attendance.rosters.read", "attendance.rosters.manage"],
      },
    ],
    [
      {
        label: "Offices",
        href: "/app/attendance/offices",
        helpKey: "offices",
        permissions: ["attendance.offices.read", "attendance.offices.manage"],
      },
      {
        label: "Holidays",
        href: "/app/attendance/holidays",
        helpKey: "holidays",
        permissions: ["attendance.holidays.read", "attendance.holidays.manage"],
      },
    ],
    [
      {
        label: "Devices",
        href: "/app/attendance/devices",
        helpKey: "devices",
        permissions: ["attendance.devices.read", "attendance.devices.manage"],
      },
      {
        label: "Security feed",
        href: "/app/attendance/security",
        helpKey: "security-feed",
        permissions: [
          "attendance.security-alerts.read",
          "attendance.security-alerts.manage",
        ],
      },
    ],
  ] as const;

const setupPaths = [
  "/app/attendance/setup",
  "/app/settings/attendance",
  "/app/modules/attendance/capabilities",
  "/app/attendance/policies",
  "/app/attendance/shifts",
  "/app/attendance/rosters",
  "/app/attendance/offices",
  "/app/attendance/holidays",
  "/app/attendance/devices",
  "/app/attendance/security",
];

export function isAttendanceWorkspacePath(pathname: string) {
  return (
    pathname === "/app/modules/attendance" ||
    pathname.startsWith("/app/modules/attendance/") ||
    pathname.startsWith("/app/attendance/") ||
    pathname === "/app/settings/attendance"
  );
}

export function attendanceSectionForPath(
  pathname: string,
): AttendanceSection | null {
  if (!isAttendanceWorkspacePath(pathname)) return null;
  if (
    setupPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return "setup";
  }
  if (pathname === "/app/modules/attendance") return "overview";
  if (pathname.startsWith("/app/attendance/register")) return "today";
  if (
    pathname.startsWith("/app/attendance/leave") ||
    pathname.startsWith("/app/attendance/requests") ||
    pathname.startsWith("/app/attendance/exceptions") ||
    pathname.startsWith("/app/attendance/regularizations")
  ) {
    return "requests";
  }
  if (pathname.startsWith("/app/attendance/field")) return "field";
  if (
    pathname.startsWith("/app/attendance/reports") ||
    pathname.startsWith("/app/attendance/payroll")
  ) {
    return "reports";
  }
  return "overview";
}

export function attendanceHelpKeyForPath(pathname: string): AttendanceHelpKey {
  if (pathname.startsWith("/app/attendance/leave")) return "requests";
  if (/^\/app\/attendance\/register\/[^/]+/.test(pathname))
    return "register-detail";
  if (/^\/app\/attendance\/regularizations\/[^/]+/.test(pathname)) {
    return "regularization-detail";
  }
  if (/^\/app\/attendance\/field\/[^/]+\/route/.test(pathname)) {
    return "field-route";
  }
  const exact: Record<string, AttendanceHelpKey> = {
    "/app/modules/attendance": "overview",
    "/app/attendance/register": "register",
    "/app/attendance/requests": "requests",
    "/app/attendance/exceptions": "exceptions",
    "/app/attendance/regularizations": "regularizations",
    "/app/attendance/field": "field",
    "/app/attendance/reports": "reports",
    "/app/attendance/payroll": "payroll-close",
    "/app/attendance/setup": "setup",
    "/app/settings/attendance": "attendance-defaults",
    "/app/modules/attendance/capabilities": "app-behavior",
    "/app/attendance/policies": "policies",
    "/app/attendance/shifts": "shifts",
    "/app/attendance/rosters": "rosters",
    "/app/attendance/offices": "offices",
    "/app/attendance/holidays": "holidays",
    "/app/attendance/devices": "devices",
    "/app/attendance/security": "security-feed",
  };
  return exact[pathname] ?? "overview";
}

export function canUseAttendanceRoute(
  item: AttendanceRouteItem,
  permissions: ReadonlySet<string>,
  capabilities: AttendanceCapabilities | null,
) {
  if (capabilities && !capabilities.attendanceEntitled) return false;
  const permitted = item.permissions.some((permission) =>
    permissions.has(permission),
  );
  if (!permitted) return false;
  if (!item.requiresField) return true;
  return Boolean(
    capabilities?.fieldTrackingEntitled &&
    (capabilities.fieldTrackingRelevant ||
      permissions.has("attendance.config.manage")),
  );
}

export function canAccessAttendanceWorkspace(
  permissions: Iterable<string>,
) {
  const granted = new Set(permissions);
  return attendanceWorkspaceAccessPermissions.some((permission) =>
    granted.has(permission),
  );
}

export function attendanceRouteAccessForPath(
  pathname: string,
): AttendanceRouteItem | null {
  if (!isAttendanceWorkspacePath(pathname)) return null;

  const feature = attendanceSetupFeatureTabs
    .flat()
    .find(
      ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    );
  if (feature) return feature;

  for (const section of ["requests", "reports"] as const) {
    const tab = attendanceSectionTabs[section]?.find(
      ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    );
    if (tab) return tab;
  }

  const section = attendanceSectionForPath(pathname);
  return (
    attendanceWorkspaceItems.find((item) => item.section === section) ?? null
  );
}

export function attendanceTabActive(pathname: string, href: string) {
  if (href === "/app/attendance/setup") return pathname === href;
  if (href === "/app/attendance/shifts") {
    return (
      pathname.startsWith("/app/attendance/shifts") ||
      pathname.startsWith("/app/attendance/rosters")
    );
  }
  if (href === "/app/attendance/offices") {
    return (
      pathname.startsWith("/app/attendance/offices") ||
      pathname.startsWith("/app/attendance/holidays")
    );
  }
  if (href === "/app/attendance/devices") {
    return (
      pathname.startsWith("/app/attendance/devices") ||
      pathname.startsWith("/app/attendance/security")
    );
  }
  if (href === "/app/settings/attendance") {
    return (
      pathname === href ||
      pathname.startsWith("/app/modules/attendance/capabilities") ||
      pathname.startsWith("/app/attendance/policies")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function attendanceSetupTabsForPath(pathname: string) {
  return (
    attendanceSetupFeatureTabs.find((tabs) =>
      tabs.some(
        ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
      ),
    ) ?? []
  );
}

export function attendanceBreadcrumbs(pathname: string) {
  const section = attendanceSectionForPath(pathname);
  if (!section) return [];
  const workspace = attendanceWorkspaceItems.find(
    (item) => item.section === section,
  );
  const crumbs = [{ label: "Attendance", href: "/app/modules/attendance" }];
  if (section !== "overview" && workspace) {
    crumbs.push({ label: workspace.label, href: workspace.href });
  }
  if (/^\/app\/attendance\/register\/[^/]+/.test(pathname)) {
    crumbs.push({ label: "Employee day", href: pathname });
  } else if (/^\/app\/attendance\/regularizations\/[^/]+/.test(pathname)) {
    crumbs.push({ label: "Correction decision", href: pathname });
  } else if (/^\/app\/attendance\/field\/[^/]+\/route/.test(pathname)) {
    crumbs.push({ label: "Route history", href: pathname });
  }
  return crumbs;
}
