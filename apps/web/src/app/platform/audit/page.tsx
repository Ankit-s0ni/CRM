import { GlobalAuditLogs } from "@/features/platform/global-audit-logs";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformAuditPage() {
  return <PlatformShell><GlobalAuditLogs /></PlatformShell>;
}
