import { Metadata } from "next";
import { Store } from "lucide-react";

export const metadata: Metadata = {
  title: "Point of Sale | DeltCRM",
};

export default function PosDashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Store className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <p className="text-sm text-on-surface-variant">Store overview and performance metrics</p>
        </div>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's Sales", value: "$0.00" },
          { label: "Active Orders", value: "0" },
          { label: "Low Stock Items", value: "0" },
          { label: "Total Categories", value: "0" },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-on-surface-variant">{stat.label}</div>
            <div className="mt-2 text-3xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-12 text-center text-on-surface-variant shadow-sm">
        <p>Detailed POS analytics and widgets will be built out in a future phase.</p>
      </div>
    </div>
  );
}
