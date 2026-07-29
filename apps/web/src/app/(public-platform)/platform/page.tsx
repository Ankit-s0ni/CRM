import { PlatformDashboard } from "@/features/platform/platform-dashboard";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformPage() {
  return <PlatformShell><PlatformDashboard /></PlatformShell>;
}
