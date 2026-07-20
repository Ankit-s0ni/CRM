import { RegularizationDetailView } from "@/components/tenant/hr-operations-views";

export default async function RegularizationDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return <RegularizationDetailView returnTo={safeReturn(returnTo)} />;
}

function safeReturn(value?: string) {
  return value?.startsWith("/app/attendance/regularizations?")
    ? value
    : "/app/attendance/regularizations";
}
