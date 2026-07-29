import { PlatformShell } from "@/features/platform/platform-shell";
import { TenantDetailView } from "@/features/platform/tenant-detail-view";

export default async function PlatformTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformShell><TenantDetailView tenantId={id} /></PlatformShell>;
}

