import { Suspense } from "react";
import { SecurityMonitoringView } from "@/features/platform/tenant-audit/security-monitoring-view";
import { LoadingState } from "@/shared/components/page-primitives";

export default function AttendanceSecurityPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SecurityMonitoringView />
    </Suspense>
  );
}
