export type MarketingProduct = {
  slug: "hrms" | "pos";
  eyebrow: string;
  name: string;
  status: string;
  headline: string;
  summary: string;
  accent: "lime" | "amber";
  metrics: readonly { value: string; label: string }[];
  features: readonly { title: string; description: string }[];
  workflow: readonly { title: string; description: string }[];
};

export const marketingProducts: Record<MarketingProduct["slug"], MarketingProduct> = {
  hrms: {
    slug: "hrms",
    eyebrow: "People operations",
    name: "Liqaa HRMS",
    status: "Available now",
    headline: "Every workday, connected from check-in to insight.",
    summary:
      "Run employee records, attendance, shifts, leave and workforce controls from one dependable source of truth.",
    accent: "lime",
    metrics: [
      { value: "1", label: "employee record" },
      { value: "Live", label: "attendance visibility" },
      { value: "Audit-ready", label: "every correction" },
    ],
    features: [
      { title: "Employee directory", description: "Keep identity, reporting lines, offices and lifecycle details together." },
      { title: "Attendance", description: "Capture check-in, checkout, worked time, late time and overtime with evidence." },
      { title: "Leave and shifts", description: "Coordinate schedules, weekly offs, holidays and approval workflows." },
      { title: "Workplace trust", description: "Apply device, location and verification rules according to policy." },
      { title: "Operational reports", description: "Export daily evidence and payroll-ready attendance summaries." },
      { title: "Regional operations", description: "Support local calendars, languages, timezones and office policies." },
    ],
    workflow: [
      { title: "Set the workplace", description: "Define offices, teams, shifts and attendance policies." },
      { title: "Invite the workforce", description: "Create employee access and assign the right operating rules." },
      { title: "Run with evidence", description: "Review live attendance, exceptions, corrections and reports." },
    ],
  },
  pos: {
    slug: "pos",
    eyebrow: "Connected commerce",
    name: "Liqaa POS",
    status: "Early access",
    headline: "The counter, catalog and stock finally agree.",
    summary:
      "Connect stores, products, transactions and inventory to the same operating layer used by the rest of your business.",
    accent: "amber",
    metrics: [
      { value: "Live", label: "stock movement" },
      { value: "Multi-store", label: "operating view" },
      { value: "One", label: "commerce ledger" },
    ],
    features: [
      { title: "Fast checkout", description: "Keep billing focused, clear and reliable during busy trading hours." },
      { title: "Product catalog", description: "Manage products, variants, taxes and pricing from a shared catalog." },
      { title: "Inventory control", description: "Track stock movement, low-stock conditions and adjustments by store." },
      { title: "Store operations", description: "Give each location the right users, devices and operating controls." },
      { title: "Returns and corrections", description: "Handle reversals and adjustments with a complete audit trail." },
      { title: "Commerce reporting", description: "Understand orders, products and store performance without data stitching." },
    ],
    workflow: [
      { title: "Configure the catalog", description: "Set products, taxes, prices, stores and stock rules." },
      { title: "Trade in real time", description: "Process orders while inventory stays synchronized." },
      { title: "Close with confidence", description: "Review sales, exceptions and store-level performance." },
    ],
  },
};
