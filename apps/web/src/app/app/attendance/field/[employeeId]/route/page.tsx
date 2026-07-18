import { FieldRouteView } from "@/components/tenant/field-route-view";

export default async function EmployeeRoutePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  return <FieldRouteView employeeId={employeeId} />;
}
