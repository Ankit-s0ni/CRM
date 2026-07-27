import { ReportsCenterView } from "@/features/platform/organization/hr-operations-views";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <ReportsCenterView
      initialType={type === "PAYROLL" ? "PAYROLL" : undefined}
    />
  );
}
