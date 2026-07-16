import { TenantShell } from "@/components/tenant/tenant-shell";

export default function TenantAppLayout({ children }: { children: React.ReactNode }) {
  return <TenantShell>{children}</TenantShell>;
}
