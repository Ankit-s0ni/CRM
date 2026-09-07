export type MarketingProduct = {
  slug: "hrms" | "pos" | "tms";
  eyebrow: string;
  name: string;
  status: string;
  headline: string;
  summary: string;
  accent: "lime" | "amber" | "cyan";
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
  tms: {
    slug: "tms",
    eyebrow: "Task & ticket operations",
    name: "Liqaa TMS",
    status: "Available now",
    headline: "Turn team coordination into clear, dependable delivery.",
    summary:
      "Manage projects, agile tickets, visual Kanban pipelines and spreadsheet imports on the same shared foundation as your company directory.",
    accent: "cyan",
    metrics: [
      { value: "Live", label: "card & table sync" },
      { value: "Smart", label: "spreadsheet import" },
      { value: "Unified", label: "employee directory" },
    ],
    features: [
      { title: "Visual Kanban & table views", description: "Switch between drag-and-drop boards and dense spreadsheet tables in real time." },
      { title: "Instant spreadsheet migration", description: "Upload Excel (.xlsx) and CSV files with automatic column mapping and validation." },
      { title: "Custom workflow pipelines", description: "Define stages, status categories, colors and allowed transitions for any team." },
      { title: "Integrated company directory", description: "Assign tasks and collaborate with team members already synchronized from Liqaa HRMS." },
      { title: "Custom fields & estimates", description: "Track client references, component modules, priorities and estimated effort hours." },
      { title: "Immutable audit history", description: "Every transition, comment, update and attachment is tracked with a full audit trail." },
    ],
    workflow: [
      { title: "Choose your workflow", description: "Start with General Operations, Bug Tracker, or Client Services templates." },
      { title: "Populate & collaborate", description: "Add team members from your directory or upload an existing spreadsheet." },
      { title: "Track & deliver", description: "Move tickets across stages, resolve blockers, and view real-time delivery status." },
    ],
  },
};
