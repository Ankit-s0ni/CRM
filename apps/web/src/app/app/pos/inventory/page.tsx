import { Metadata } from "next";
import { Boxes } from "lucide-react";

export const metadata: Metadata = {
  title: "Inventory | POS | DeltCRM",
};

export default function PosInventoryPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
            <Boxes className="size-5" />
          </div>
          <h1 className="text-xl font-bold">Inventory Management</h1>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          Add Stock
        </button>
      </div>
      
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-on-surface-variant shadow-sm">
        <p>Inventory management lists and workflows will be implemented in Phase 2.</p>
      </div>
    </div>
  );
}
