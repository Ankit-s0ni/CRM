import { Suspense } from "react";
import { DeviceManagementView } from "@/features/platform/workspace-settings/device-management-view";
import { LoadingState } from "@/shared/components/page-primitives";

export default function DevicesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DeviceManagementView />
    </Suspense>
  );
}
