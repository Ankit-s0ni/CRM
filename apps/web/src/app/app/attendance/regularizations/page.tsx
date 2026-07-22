import { Suspense } from "react";
import { RegularizationQueueView } from "@/features/platform/organization/hr-operations-views";
import { LoadingState } from "@/shared/components/page-primitives";

export default function RegularizationsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RegularizationQueueView />
    </Suspense>
  );
}
