import { PlatformHealthView } from "@/features/platform/platform-health-view";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformHealthPage() {
  return <PlatformShell><PlatformHealthView /></PlatformShell>;
}
