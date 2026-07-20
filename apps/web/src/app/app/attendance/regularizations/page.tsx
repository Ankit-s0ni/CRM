import { Suspense } from "react";
import { RegularizationQueueView } from "@/components/tenant/hr-operations-views";
import { LoadingState } from "@/components/tenant/page-primitives";

export default function RegularizationsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RegularizationQueueView />
    </Suspense>
  );
}
