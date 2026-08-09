import type { AttendanceHelpKey } from "@/content/attendance-help";
import {
  HRMS_ATTENDANCE_ROOT,
  toCanonicalHrmsPath,
} from "@/lib/hrms-route-contract";

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
    href: HRMS_ATTENDANCE_ROOT,
    helpKey: "overview",
    permissions: attendanceWorkspaceAccessPermissions,
  },
  {
    section: "today",
    label: "Today",
    href: `${HRMS_ATTENDANCE_ROOT}/register`,
    helpKey: "register",
    permissions: ["attendance.records.read"],
  },
  {
    section: "requests",
    label: "Leave",
    href: `${HRMS_ATTENDANCE_ROOT}/requests`,
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
    href: `${HRMS_ATTENDANCE_ROOT}/field`,
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
    href: `${HRMS_ATTENDANCE_ROOT}/reports`,
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
    href: `${HRMS_ATTENDANCE_ROOT}/setup`,
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
      href: `${HRMS_ATTENDANCE_ROOT}/leave/requests`,
      helpKey: "requests",
      permissions: ["leave.self", "leave.approve", "leave.manage"],
    },
    {
      label: "OD & WFH",
      href: `${HRMS_ATTENDANCE_ROOT}/exceptions`,
      helpKey: "exceptions",
      permissions: ["attendance.exceptions.read"],
    },
    {
      label: "Corrections",
      href: `${HRMS_ATTENDANCE_ROOT}/regularizations`,
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
      href: `${HRMS_ATTENDANCE_ROOT}/reports`,
      helpKey: "reports",
      permissions: ["attendance.reports.read", "attendance.reports.generate"],
    },
    {
      label: "Payroll close",
      href: `${HRMS_ATTENDANCE_ROOT}/payroll`,
      helpKey: "payroll-close",
      permissions: ["attendance.payroll-lock.manage"],
    },
  ],
  setup: [
    {
      label: "Setup home",
      href: `${HRMS_ATTENDANCE_ROOT}/setup`,
      helpKey: "setup",
      permissions: attendanceWorkspaceItems.find(
        ({ section }) => section === "setup",
      )!.permissions,
    },
    {
      label: "Rules",
      href: `${HRMS_ATTENDANCE_ROOT}/policies`,
      helpKey: "policies",
      permissions: ["attendance.policies.read", "attendance.policies.manage"],
    },
    {
      label: "Schedule",
      href: `${HRMS_ATTENDANCE_ROOT}/shifts`,
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
      href: `${HRMS_ATTENDANCE_ROOT}/offices`,
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
      href: `${HRMS_ATTENDANCE_ROOT}/devices`,
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
      href: `${HRMS_ATTENDANCE_ROOT}/setup/leave`,
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
        href: `${HRMS_ATTENDANCE_ROOT}/shifts`,
        helpKey: "shifts",
        permissions: ["attendance.shifts.read", "attendance.shifts.manage"],
      },
      {
        label: "Rosters",
        href: `${HRMS_ATTENDANCE_ROOT}/rosters`,
        helpKey: "rosters",
        permissions: ["attendance.rosters.read", "attendance.rosters.manage"],
      },
    ],
    [
      {
        label: "Offices",
        href: `${HRMS_ATTENDANCE_ROOT}/offices`,
        helpKey: "offices",
        permissions: ["attendance.offices.read", "attendance.offices.manage"],
      },
      {
        label: "Holidays",
        href: `${HRMS_ATTENDANCE_ROOT}/holidays`,
        helpKey: "holidays",
        permissions: ["attendance.holidays.read", "attendance.holidays.manage"],
      },
    ],
    [
      {
        label: "Devices",
        href: `${HRMS_ATTENDANCE_ROOT}/devices`,
        helpKey: "devices",
        permissions: ["attendance.devices.read", "attendance.devices.manage"],
      },
      {
        label: "Security feed",
        href: `${HRMS_ATTENDANCE_ROOT}/security`,
        helpKey: "security-feed",
        permissions: [
          "attendance.security-alerts.read",
          "attendance.security-alerts.manage",
        ],
      },
    ],
  ] as const;

const setupPaths = [
  `${HRMS_ATTENDANCE_ROOT}/setup`,
  "/app/settings/attendance",
  `${HRMS_ATTENDANCE_ROOT}/capabilities`,
  `${HRMS_ATTENDANCE_ROOT}/policies`,
  `${HRMS_ATTENDANCE_ROOT}/shifts`,
  `${HRMS_ATTENDANCE_ROOT}/rosters`,
  `${HRMS_ATTENDANCE_ROOT}/offices`,
  `${HRMS_ATTENDANCE_ROOT}/holidays`,
  `${HRMS_ATTENDANCE_ROOT}/devices`,
  `${HRMS_ATTENDANCE_ROOT}/security`,
];

export function isAttendanceWorkspacePath(pathname: string) {
  const path = toCanonicalHrmsPath(pathname);
  return (
    path === HRMS_ATTENDANCE_ROOT ||
    path.startsWith(`${HRMS_ATTENDANCE_ROOT}/`) ||
    path === "/app/settings/attendance"
  );
}

export function attendanceSectionForPath(
  pathname: string,
): AttendanceSection | null {
  if (!isAttendanceWorkspacePath(pathname)) return null;
  const path = toCanonicalHrmsPath(pathname);
  if (
    setupPaths.some(
      (setupPath) => path === setupPath || path.startsWith(`${setupPath}/`),
    )
  ) {
    return "setup";
  }
  if (path === HRMS_ATTENDANCE_ROOT) return "overview";
  if (path.startsWith(`${HRMS_ATTENDANCE_ROOT}/register`)) return "today";
  if (
    path.startsWith(`${HRMS_ATTENDANCE_ROOT}/leave`) ||
    path.startsWith(`${HRMS_ATTENDANCE_ROOT}/requests`) ||
    path.startsWith(`${HRMS_ATTENDANCE_ROOT}/exceptions`) ||
    path.startsWith(`${HRMS_ATTENDANCE_ROOT}/regularizations`)
  ) {
    return "requests";
  }
  if (path.startsWith(`${HRMS_ATTENDANCE_ROOT}/field`)) return "field";
  if (
    path.startsWith(`${HRMS_ATTENDANCE_ROOT}/reports`) ||
    path.startsWith(`${HRMS_ATTENDANCE_ROOT}/payroll`)
  ) {
    return "reports";
  }
  return "overview";
}

export function attendanceHelpKeyForPath(pathname: string): AttendanceHelpKey {
  const path = toCanonicalHrmsPath(pathname);
  if (path.startsWith(`${HRMS_ATTENDANCE_ROOT}/leave`)) return "requests";
  if (/^\/app\/hrms\/attendance\/register\/[^/]+/.test(path))
    return "register-detail";
  if (/^\/app\/hrms\/attendance\/regularizations\/[^/]+/.test(path)) {
    return "regularization-detail";
  }
  if (/^\/app\/hrms\/attendance\/field\/[^/]+\/route/.test(path)) {
    return "field-route";
  }
  const exact: Record<string, AttendanceHelpKey> = {
    [HRMS_ATTENDANCE_ROOT]: "overview",
    [`${HRMS_ATTENDANCE_ROOT}/register`]: "register",
    [`${HRMS_ATTENDANCE_ROOT}/requests`]: "requests",
    [`${HRMS_ATTENDANCE_ROOT}/exceptions`]: "exceptions",
    [`${HRMS_ATTENDANCE_ROOT}/regularizations`]: "regularizations",
    [`${HRMS_ATTENDANCE_ROOT}/field`]: "field",
    [`${HRMS_ATTENDANCE_ROOT}/reports`]: "reports",
    [`${HRMS_ATTENDANCE_ROOT}/payroll`]: "payroll-close",
    [`${HRMS_ATTENDANCE_ROOT}/setup`]: "setup",
    "/app/settings/attendance": "attendance-defaults",
    [`${HRMS_ATTENDANCE_ROOT}/capabilities`]: "app-behavior",
    [`${HRMS_ATTENDANCE_ROOT}/policies`]: "policies",
    [`${HRMS_ATTENDANCE_ROOT}/shifts`]: "shifts",
    [`${HRMS_ATTENDANCE_ROOT}/rosters`]: "rosters",
    [`${HRMS_ATTENDANCE_ROOT}/offices`]: "offices",
    [`${HRMS_ATTENDANCE_ROOT}/holidays`]: "holidays",
    [`${HRMS_ATTENDANCE_ROOT}/devices`]: "devices",
    [`${HRMS_ATTENDANCE_ROOT}/security`]: "security-feed",
  };
  return exact[path] ?? "overview";
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
  const path = toCanonicalHrmsPath(pathname);

  const feature = attendanceSetupFeatureTabs
    .flat()
    .find(
      ({ href }) => path === href || path.startsWith(`${href}/`),
    );
  if (feature) return feature;

  for (const section of ["requests", "reports"] as const) {
    const tab = attendanceSectionTabs[section]?.find(
      ({ href }) => path === href || path.startsWith(`${href}/`),
    );
    if (tab) return tab;
  }

  const section = attendanceSectionForPath(pathname);
  return (
    attendanceWorkspaceItems.find((item) => item.section === section) ?? null
  );
}

export function attendanceTabActive(pathname: string, href: string) {
  const path = toCanonicalHrmsPath(pathname);
  const canonicalHref = toCanonicalHrmsPath(href);
  if (canonicalHref === `${HRMS_ATTENDANCE_ROOT}/setup`) {
    return path === canonicalHref;
  }
  if (canonicalHref === `${HRMS_ATTENDANCE_ROOT}/shifts`) {
    return (
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/shifts`) ||
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/rosters`)
    );
  }
  if (canonicalHref === `${HRMS_ATTENDANCE_ROOT}/offices`) {
    return (
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/offices`) ||
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/holidays`)
    );
  }
  if (canonicalHref === `${HRMS_ATTENDANCE_ROOT}/devices`) {
    return (
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/devices`) ||
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/security`)
    );
  }
  if (canonicalHref === "/app/settings/attendance") {
    return (
      path === canonicalHref ||
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/capabilities`) ||
      path.startsWith(`${HRMS_ATTENDANCE_ROOT}/policies`)
    );
  }
  return path === canonicalHref || path.startsWith(`${canonicalHref}/`);
}

export function attendanceSetupTabsForPath(pathname: string) {
  const path = toCanonicalHrmsPath(pathname);
  return (
    attendanceSetupFeatureTabs.find((tabs) =>
      tabs.some(
        ({ href }) => path === href || path.startsWith(`${href}/`),
      ),
    ) ?? []
  );
}

export function attendanceBreadcrumbs(pathname: string) {
  const path = toCanonicalHrmsPath(pathname);
  const section = attendanceSectionForPath(pathname);
  if (!section) return [];
  const workspace = attendanceWorkspaceItems.find(
    (item) => item.section === section,
  );
  const crumbs = [{ label: "Attendance", href: HRMS_ATTENDANCE_ROOT }];
  if (section !== "overview" && workspace) {
    crumbs.push({ label: workspace.label, href: workspace.href });
  }
  if (/^\/app\/hrms\/attendance\/register\/[^/]+/.test(path)) {
    crumbs.push({ label: "Employee day", href: path });
  } else if (/^\/app\/hrms\/attendance\/regularizations\/[^/]+/.test(path)) {
    crumbs.push({ label: "Correction decision", href: path });
  } else if (/^\/app\/hrms\/attendance\/field\/[^/]+\/route/.test(path)) {
    crumbs.push({ label: "Route history", href: path });
  }
  return crumbs;
}
