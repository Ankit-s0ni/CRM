import {
  HRMS_ATTENDANCE_ROOT,
  HRMS_PAYROLL_ROOT,
  toCanonicalHrmsPath,
} from "@/lib/hrms-route-contract";

export const payrollWorkspacePaths = [
  HRMS_PAYROLL_ROOT,
  `${HRMS_PAYROLL_ROOT}/foundation`,
  `${HRMS_PAYROLL_ROOT}/runs`,
  `${HRMS_PAYROLL_ROOT}/processing`,
  `${HRMS_PAYROLL_ROOT}/payslips`,
  `${HRMS_PAYROLL_ROOT}/exports`,
  `${HRMS_ATTENDANCE_ROOT}/payroll`,
  "/app/settings/payroll",
] as const;

export function isPayrollWorkspacePath(pathname: string) {
  const path = toCanonicalHrmsPath(pathname);
  return payrollWorkspacePaths.some(
    (workspacePath) =>
      path === workspacePath || path.startsWith(`${workspacePath}/`),
  );
}

export function payrollSectionForPath(pathname: string) {
  const path = toCanonicalHrmsPath(pathname);
  if (path.startsWith(`${HRMS_PAYROLL_ROOT}/runs`)) return "runs";
  if (path.startsWith(`${HRMS_PAYROLL_ROOT}/processing`)) return "processing";
  if (path.startsWith(`${HRMS_PAYROLL_ROOT}/payslips`)) return "payslips";
  if (path.startsWith(`${HRMS_PAYROLL_ROOT}/exports`)) return "exports";
  if (path === HRMS_PAYROLL_ROOT) return "foundation";
  if (path.startsWith(`${HRMS_PAYROLL_ROOT}/foundation`)) return "foundation";
  if (path.startsWith(`${HRMS_ATTENDANCE_ROOT}/payroll`)) return "close";
  if (path.startsWith("/app/settings/payroll")) return "settings";
  return null;
}
