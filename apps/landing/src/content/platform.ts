export type ProductDomain = {
  id: string;
  name: string;
  statement: string;
  modules: readonly string[];
  status: "available" | "expanding" | "planned";
  tone: "mint" | "blue" | "amber" | "coral" | "violet" | "slate";
};

export const productDomains: readonly ProductDomain[] = [
  {
    id: "hrms",
    name: "HRMS",
    statement: "People operations, connected from first day to every payday.",
    modules: ["Attendance", "Payroll", "Leave", "Shifts", "Recruitment", "Performance"],
    status: "available",
    tone: "mint",
  },
  {
    id: "crm",
    name: "CRM",
    statement: "A complete view of every relationship, opportunity, and deal.",
    modules: ["Leads", "Contacts", "Opportunities", "Deals", "Customers"],
    status: "expanding",
    tone: "blue",
  },
  {
    id: "pos",
    name: "POS",
    statement: "Stores, stock, orders, and billing moving as one system.",
    modules: ["Billing", "Inventory", "Products", "Orders", "Stores"],
    status: "planned",
    tone: "amber",
  },
  {
    id: "communication",
    name: "Communication",
    statement: "Business conversations that stay attached to the work.",
    modules: ["Business Mail", "Campaigns", "Team Inbox", "Notifications"],
    status: "expanding",
    tone: "coral",
  },
  {
    id: "finance",
    name: "Finance",
    statement: "Operational numbers with context from across the business.",
    modules: ["Billing", "Expenses", "Ledgers", "Forecasting"],
    status: "planned",
    tone: "violet",
  },
  {
    id: "projects",
    name: "Projects",
    statement: "Plans, ownership, delivery, and outcomes in one shared rhythm.",
    modules: ["Projects", "Tasks", "Time", "Resources"],
    status: "planned",
    tone: "slate",
  },
];

export const platformServices = [
  "Identity",
  "Permissions",
  "Analytics",
  "Integrations",
  "Automation",
  "AI",
] as const;

export const storyChapters = [
  { number: "01", label: "The fragmentation", anchor: "fragmentation" },
  { number: "02", label: "One operating layer", anchor: "platform" },
  { number: "03", label: "Connected domains", anchor: "domains" },
  { number: "04", label: "Intelligence in motion", anchor: "intelligence" },
] as const;
