export const HRMS_ROOT = "/app/hrms";
export const HRMS_ATTENDANCE_ROOT = `${HRMS_ROOT}/attendance`;
export const HRMS_PAYROLL_ROOT = `${HRMS_ROOT}/payroll`;
export const HRMS_UNAUTHORIZED_PATH = `${HRMS_ROOT}/unauthorized`;
export const HRMS_SUBSCRIPTION_REQUIRED_PATH = `${HRMS_ROOT}/subscription-required`;
export const HRMS_UNAVAILABLE_PATH = `${HRMS_ROOT}/unavailable`;

export type HrmsRouteRewrite = {
  source: string;
  destination: string;
};

/**
 * Public HRMS routes stay stable while the current monolith remains the runtime.
 * These rewrites can later point at an extracted HRMS frontend without changing
 * tenant bookmarks or navigation contracts.
 */
export function hrmsRouteRewrites(): HrmsRouteRewrite[] {
  return [
    {
      source: "/:lang(en|ar)/app/hrms",
      destination: "/:lang/app/modules/attendance",
    },
    {
      source: "/:lang(en|ar)/app/hrms/attendance",
      destination: "/:lang/app/modules/attendance",
    },
    {
      source: "/:lang(en|ar)/app/hrms/attendance/capabilities",
      destination: "/:lang/app/modules/attendance/capabilities",
    },
    {
      source: "/:lang(en|ar)/app/hrms/attendance/:path*",
      destination: "/:lang/app/attendance/:path*",
    },
    {
      source: "/:lang(en|ar)/app/hrms/payroll",
      destination: "/:lang/app/modules/payroll",
    },
    {
      source: "/:lang(en|ar)/app/hrms/payroll/:path*",
      destination: "/:lang/app/modules/payroll/:path*",
    },
    {
      source: "/:lang(en|ar)/app/hrms/employees",
      destination: "/:lang/app/employees",
    },
    {
      source: "/:lang(en|ar)/app/hrms/employees/:path*",
      destination: "/:lang/app/employees/:path*",
    },
    {
      source: "/:lang(en|ar)/app/hrms/leave",
      destination: "/:lang/app/attendance/leave",
    },
    {
      source: "/:lang(en|ar)/app/hrms/leave/:path*",
      destination: "/:lang/app/attendance/leave/:path*",
    },
    {
      source: "/:lang(en|ar)/app/hrms/reports",
      destination: "/:lang/app/reports",
    },
    {
      source: "/:lang(en|ar)/app/hrms/reports/:path*",
      destination: "/:lang/app/reports/:path*",
    },
  ];
}

export function toCanonicalHrmsPath(pathname: string) {
  return transformPath(pathname, (path) => {
    if (path === "/app/modules/attendance/capabilities") {
      return `${HRMS_ATTENDANCE_ROOT}/capabilities`;
    }
    if (path === "/app/modules/attendance") return HRMS_ATTENDANCE_ROOT;
    if (path === "/app/attendance") return HRMS_ATTENDANCE_ROOT;
    if (path.startsWith("/app/attendance/")) {
      return `${HRMS_ATTENDANCE_ROOT}${path.slice("/app/attendance".length)}`;
    }
    if (path === "/app/leave") return `${HRMS_ROOT}/leave`;
    if (path.startsWith("/app/leave/")) {
      return `${HRMS_ROOT}/leave${path.slice("/app/leave".length)}`;
    }
    if (path === "/app/modules/payroll" || path === "/app/payroll") {
      return HRMS_PAYROLL_ROOT;
    }
    if (path.startsWith("/app/modules/payroll/")) {
      return `${HRMS_PAYROLL_ROOT}${path.slice("/app/modules/payroll".length)}`;
    }
    if (path.startsWith("/app/payroll/")) {
      return `${HRMS_PAYROLL_ROOT}${path.slice("/app/payroll".length)}`;
    }
    return path;
  });
}

export function toLegacyHrmsPath(pathname: string) {
  return transformPath(pathname, (path) => {
    if (path === HRMS_ROOT || path === HRMS_ATTENDANCE_ROOT) {
      return "/app/modules/attendance";
    }
    if (path === `${HRMS_ATTENDANCE_ROOT}/capabilities`) {
      return "/app/modules/attendance/capabilities";
    }
    if (path.startsWith(`${HRMS_ATTENDANCE_ROOT}/`)) {
      return `/app/attendance${path.slice(HRMS_ATTENDANCE_ROOT.length)}`;
    }
    if (path === HRMS_PAYROLL_ROOT) return "/app/modules/payroll";
    if (path.startsWith(`${HRMS_PAYROLL_ROOT}/`)) {
      return `/app/modules/payroll${path.slice(HRMS_PAYROLL_ROOT.length)}`;
    }
    if (path === `${HRMS_ROOT}/employees`) return "/app/employees";
    if (path.startsWith(`${HRMS_ROOT}/employees/`)) {
      return `/app/employees${path.slice(`${HRMS_ROOT}/employees`.length)}`;
    }
    if (path === `${HRMS_ROOT}/leave`) return "/app/attendance/leave";
    if (path.startsWith(`${HRMS_ROOT}/leave/`)) {
      return `/app/attendance/leave${path.slice(`${HRMS_ROOT}/leave`.length)}`;
    }
    if (path === `${HRMS_ROOT}/reports`) return "/app/reports";
    if (path.startsWith(`${HRMS_ROOT}/reports/`)) {
      return `/app/reports${path.slice(`${HRMS_ROOT}/reports`.length)}`;
    }
    return path;
  });
}

export function hrmsAccessStatePathForCode(code?: string | null) {
  switch (code) {
    case "PRODUCT_NOT_ENTITLED":
    case "CAPABILITY_NOT_ENTITLED":
    case "SUBSCRIPTION_INACTIVE":
      return HRMS_SUBSCRIPTION_REQUIRED_PATH;
    case "PRODUCT_UNAVAILABLE":
    case "PRODUCT_PROVISIONING":
    case "SERVICE_UNAVAILABLE":
      return HRMS_UNAVAILABLE_PATH;
    case "FORBIDDEN":
    case "INSUFFICIENT_PERMISSION":
    case "PRODUCT_PERMISSION_DENIED":
    case "UNAUTHORIZED":
      return HRMS_UNAUTHORIZED_PATH;
    default:
      return null;
  }
}

function transformPath(
  pathname: string,
  transform: (path: string) => string,
) {
  const suffixIndex = pathname.search(/[?#]/);
  const path = suffixIndex === -1 ? pathname : pathname.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : pathname.slice(suffixIndex);
  const localeMatch = path.match(/^\/(en|ar)(?=\/|$)/);
  const localePrefix = localeMatch?.[0] ?? "";
  const tenantPath = localePrefix ? path.slice(localePrefix.length) || "/" : path;

  return `${localePrefix}${transform(tenantPath)}${suffix}`;
}
