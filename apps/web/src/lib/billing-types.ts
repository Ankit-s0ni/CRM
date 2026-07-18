export type BillingAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
};

export type BillingProfile = {
  tenantId: string;
  legalName: string;
  billingEmail: string;
  gstin?: string | null;
  pan?: string | null;
  currency: string;
  address?: BillingAddress | null;
};

export type BillingModule = { module: { id: string; key: string; name: string } };

export type BillingPlan = {
  id: string;
  name: string;
  description?: string | null;
  pricePerUser: string;
  currency: string;
  maxEmployees: number;
  billingPeriod: "MONTHLY" | "YEARLY";
  isActive: boolean;
  modules: BillingModule[];
  _count?: { subscriptions: number };
};

export type TenantSubscription = {
  id: string;
  status: string;
  seatCount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  dunningState: string;
  pendingPlanId?: string | null;
  scheduledChangeAt?: string | null;
  plan: BillingPlan;
  availablePlans: BillingPlan[];
  usage: {
    activeEmployees: number;
    seats: number;
    maximumEmployees: number;
  };
};

export type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  amountDue: string;
  currency: string;
  dueDate: string;
  issuedAt?: string | null;
  pdfChecksum?: string | null;
  tenant?: { id: string; companyName: string; subdomain: string };
  subscription?: { plan: BillingPlan };
  lineItems?: Array<{ id: string; description: string; quantity: string; amount: string }>;
  transactions?: BillingTransaction[];
};

export type BillingTransaction = {
  id: string;
  gateway: string;
  gatewayRef?: string | null;
  status: string;
  amount: string;
  currency: string;
  failureReason?: string | null;
  attemptedAt: string;
  invoice?: BillingInvoice;
};

export type BillingPaymentMethod = {
  id: string;
  gateway: string;
  methodType: string;
  displayName: string;
  lastFour?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  isDefault: boolean;
  status: string;
};

export type DunningSubscription = TenantSubscription & {
  tenant: { id: string; companyName: string; subdomain: string; status: string };
  invoices: BillingInvoice[];
  dunningHistory: Array<{
    id: string;
    action: string;
    fromState: string;
    toState: string;
    reason: string;
    createdAt: string;
  }>;
};

export type Paginated<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type BillingDashboardData = {
  revenueByCurrency: Array<{
    currency: string;
    mrr: string;
    collectedThisMonth: string;
  }>;
  outstanding: string;
  failedPaymentsThisMonth: number;
  recentSubscriptions: Array<TenantSubscription & { tenant: { companyName: string; subdomain: string } }>;
};

export type PaymentProviderHealth = {
  providers: Array<{
    provider: string;
    status: "up" | "down";
    latencyMs: number;
    detail?: string;
  }>;
  webhook: {
    latestReceivedAt?: string | null;
    lagSeconds?: number | null;
    failed: number;
    pending: number;
  };
  checkedAt: string;
};

const currencySymbols: Record<string, string> = {
  INR: "₹",
  AED: "AED ",
  OMR: "OMR ",
  QAR: "QAR ",
  SAR: "SAR ",
  USD: "$",
};

export function formatMoney(value: string, currency: string) {
  const normalized = /^-?\d+(?:\.\d+)?$/.test(value) ? value : "0";
  const negative = normalized.startsWith("-");
  const [integerRaw, fractionRaw = ""] = normalized.replace("-", "").split(".");
  const integer = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = fractionRaw.padEnd(currency === "OMR" ? 3 : 2, "0").slice(0, currency === "OMR" ? 3 : 2);
  return `${negative ? "-" : ""}${currencySymbols[currency] ?? `${currency} `}${integer}.${fraction}`;
}

export function sumMoney(values: string[], currency: string) {
  const scale = currency === "OMR" ? 3 : 2;
  const factor = BigInt(10) ** BigInt(scale);
  const total = values.reduce((sum, value) => {
    const match = value.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!match) return sum;
    const fraction = (match[3] ?? "").padEnd(scale, "0").slice(0, scale);
    const minor = BigInt(match[2]) * factor + BigInt(fraction || "0");
    return sum + (match[1] === "-" ? -minor : minor);
  }, BigInt(0));
  const negative = total < BigInt(0);
  const absolute = negative ? -total : total;
  return `${negative ? "-" : ""}${absolute / factor}.${String(absolute % factor).padStart(scale, "0")}`;
}

export function formatBillingDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
