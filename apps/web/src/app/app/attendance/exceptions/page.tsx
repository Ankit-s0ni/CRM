import { Suspense } from "react";
import { AttendanceExceptionsView } from "@/components/tenant/attendance-exceptions-view";
import { LoadingState } from "@/components/tenant/page-primitives";

export default function AttendanceExceptionsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AttendanceExceptionsView />
    </Suspense>
  );
}
