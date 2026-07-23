import { Metadata } from "next";
import { Settings2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings | POS | DeltCRM",
};

export default function PosSettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
          <Settings2 className="size-5" />
        </div>
        <h1 className="text-xl font-bold">POS Settings</h1>
      </div>
      
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-on-surface-variant shadow-sm">
        <p>POS configuration (tax rates, receipts, hardware integrations) will be implemented later.</p>
      </div>
    </div>
  );
}
