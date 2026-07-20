import { Suspense } from "react";
import { AttendanceRegisterView } from "@/components/tenant/attendance-register-view";
import { LoadingState } from "@/components/tenant/page-primitives";

export default function AttendanceRegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AttendanceRegisterView />
    </Suspense>
  );
}
