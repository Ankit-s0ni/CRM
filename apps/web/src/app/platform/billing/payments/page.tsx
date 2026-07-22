import { PlatformPaymentsView } from "@/features/platform/platform-billing-views";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformPaymentsPage() {
  return <PlatformShell><PlatformPaymentsView /></PlatformShell>;
}
