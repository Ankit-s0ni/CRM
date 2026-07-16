import { PlatformShell } from "@/components/platform/platform-shell";
import { TenantDetailView } from "@/components/platform/tenant-detail-view";

export default async function PlatformTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlatformShell><TenantDetailView tenantId={id} /></PlatformShell>;
}

