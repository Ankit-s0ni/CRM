import { AttendanceDetailView } from "@/features/products/attendance/core/attendance-detail-view";

export default async function AttendanceEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ date?: string; returnTo?: string }>;
}) {
  const [{ employeeId }, { date, returnTo }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <AttendanceDetailView
      employeeId={employeeId}
      initialDate={date}
      returnTo={safeRegisterReturn(returnTo)}
    />
  );
}

function safeRegisterReturn(value?: string) {
  return value?.startsWith("/app/attendance/register?")
    ? value
    : "/app/attendance/register";
}
