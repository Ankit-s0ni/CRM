import { PlatformInvoicesView } from "@/features/platform/platform-billing-views";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformInvoicesPage() {
  return <PlatformShell><PlatformInvoicesView /></PlatformShell>;
}
