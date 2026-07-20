import { Suspense } from "react";
import { DeviceManagementView } from "@/components/tenant/device-management-view";
import { LoadingState } from "@/components/tenant/page-primitives";

export default function DevicesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DeviceManagementView />
    </Suspense>
  );
}
