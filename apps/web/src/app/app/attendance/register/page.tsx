import { Suspense } from "react";
import { AttendanceRegisterView } from "@/features/products/attendance/core/attendance-register-view";
import { LoadingState } from "@/shared/components/page-primitives";

export default function AttendanceRegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AttendanceRegisterView />
    </Suspense>
  );
}
