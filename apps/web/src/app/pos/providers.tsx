"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * React Query is scoped to POS routes only (see docs/POS/POS-FOUNDATION-DECISIONS.md D3).
 * Attendance and platform code stay on the existing axios + zustand pattern — do not
 * lift this provider into the root layout.
 */
export function PosQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The register reads change under other cashiers, so refetch on focus but
            // do not hammer the API while a cashier is mid-sale.
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
