import { EmployeeDetailView } from "@/features/platform/organization/employee-detail-view";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeDetailView employeeId={id} />;
}
