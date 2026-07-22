import { PlatformBillingOverview } from "@/features/platform/platform-billing-views";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformBillingPage() {
  return <PlatformShell><PlatformBillingOverview /></PlatformShell>;
}
