import { ModuleManagement } from "@/features/platform/module-management";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformProductsPage() {
  return <PlatformShell><ModuleManagement /></PlatformShell>;
}
