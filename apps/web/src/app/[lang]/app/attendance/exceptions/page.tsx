import { Suspense } from "react";
import { AttendanceExceptionsView } from "@/features/products/attendance/core/attendance-exceptions-view";
import { LoadingState } from "@/shared/components/page-primitives";

export default function AttendanceExceptionsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AttendanceExceptionsView />
    </Suspense>
  );
}
