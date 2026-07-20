import { Suspense } from "react";
import { FieldMonitoringView } from "@/components/tenant/field-monitoring-view";
import { LoadingState } from "@/components/tenant/page-primitives";

export default function FieldMonitoringPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FieldMonitoringView />
    </Suspense>
  );
}
