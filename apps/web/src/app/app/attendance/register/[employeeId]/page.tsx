import { AttendanceDetailView } from "@/components/tenant/attendance-detail-view";

export default async function AttendanceEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ employeeId }, { date }] = await Promise.all([params, searchParams]);
  return <AttendanceDetailView employeeId={employeeId} initialDate={date} />;
}
