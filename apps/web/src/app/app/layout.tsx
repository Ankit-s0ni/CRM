import { TenantShell } from "@/shared/layouts/tenant-shell";

export default function TenantAppLayout({ children }: { children: React.ReactNode }) {
  return <TenantShell>{children}</TenantShell>;
}
