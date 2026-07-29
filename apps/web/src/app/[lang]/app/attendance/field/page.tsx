import { Suspense } from "react";
import { FieldMonitoringView } from "@/features/products/attendance/field/field-monitoring-view";
import { LoadingState } from "@/shared/components/page-primitives";

export default function FieldMonitoringPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FieldMonitoringView />
    </Suspense>
  );
}
