import { Suspense } from "react";
import { SecurityMonitoringView } from "@/components/tenant/security-monitoring-view";
import { LoadingState } from "@/components/tenant/page-primitives";

export default function AttendanceSecurityPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SecurityMonitoringView />
    </Suspense>
  );
}
