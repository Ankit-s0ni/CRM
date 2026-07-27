import { PosShell } from "@/features/products/pos/core/pos-shell";
import { PosQueryProvider } from "./providers";

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PosQueryProvider>
      <PosShell>{children}</PosShell>
    </PosQueryProvider>
  );
}
