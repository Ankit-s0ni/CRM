export const payrollWorkspacePaths = [
  "/app/modules/payroll",
  "/app/modules/payroll/foundation",
  "/app/payroll/runs",
  "/app/modules/payroll/processing",
  "/app/modules/payroll/payslips",
  "/app/modules/payroll/exports",
  "/app/attendance/payroll",
  "/app/settings/payroll",
] as const;

export function isPayrollWorkspacePath(pathname: string) {
  return payrollWorkspacePaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function payrollSectionForPath(pathname: string) {
  if (pathname.startsWith("/app/payroll/runs")) return "runs";
  if (pathname.startsWith("/app/modules/payroll/runs")) return "runs";
  if (pathname.startsWith("/app/modules/payroll/processing")) return "processing";
  if (pathname.startsWith("/app/modules/payroll/payslips")) return "payslips";
  if (pathname.startsWith("/app/modules/payroll/exports")) return "exports";
  if (pathname === "/app/modules/payroll") return "foundation";
  if (pathname.startsWith("/app/modules/payroll/foundation")) return "foundation";
  if (pathname.startsWith("/app/attendance/payroll")) return "close";
  if (pathname.startsWith("/app/settings/payroll")) return "settings";
  return null;
}
