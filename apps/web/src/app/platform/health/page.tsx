import { PlatformHealthView } from "@/components/platform/platform-health-view";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformHealthPage() {
  return <PlatformShell><PlatformHealthView /></PlatformShell>;
}
