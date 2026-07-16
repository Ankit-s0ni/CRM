import { PlatformDashboard } from "@/components/platform/platform-dashboard";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformPage() {
  return <PlatformShell><PlatformDashboard /></PlatformShell>;
}
