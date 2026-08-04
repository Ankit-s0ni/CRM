import { PayrollRunPreparationWorkspace } from "@/features/products/payroll/payroll-run-preparation-workspace";

export default async function PayrollRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string | string[] }>;
}) {
  const params = await searchParams;
  const employeeId = Array.isArray(params.employeeId)
    ? params.employeeId[0]
    : params.employeeId;
  return <PayrollRunPreparationWorkspace initialEmployeeId={employeeId ?? ""} />;
}
