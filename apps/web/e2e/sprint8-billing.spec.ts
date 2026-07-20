import { expect, test, type Page } from "@playwright/test";

const tenantId = "80000000-0000-4000-8000-000000000001";
const plan = {
  id: "80000000-0000-4000-8000-000000000101",
  name: "Growth",
  description: "Attendance, leave and employee operations",
  pricePerUser: "299.00",
  currency: "INR",
  maxEmployees: 250,
  billingPeriod: "MONTHLY",
  isActive: true,
  modules: [
    {
      module: {
        id: "80000000-0000-4000-8000-000000000201",
        key: "ATTENDANCE",
        name: "Attendance",
      },
    },
  ],
  capabilities: [
    {
      capability: {
        id: "cap-core",
        key: "ATTENDANCE_CORE",
        name: "Attendance check-in and check-out",
        isCore: true,
        dependencyKeys: [],
        requiredModuleKeys: ["ATTENDANCE"],
      },
    },
    {
      capability: {
        id: "cap-basic",
        key: "ATTENDANCE_REPORTS_BASIC",
        name: "Attendance registers and basic reports",
        isCore: true,
        dependencyKeys: ["ATTENDANCE_CORE"],
        requiredModuleKeys: ["ATTENDANCE"],
      },
    },
  ],
  _count: { subscriptions: 8 },
};
const enterprise = {
  ...plan,
  id: "80000000-0000-4000-8000-000000000102",
  name: "Enterprise",
  description: "All DeltCRM modules with higher employee limits",
  pricePerUser: "499.00",
  maxEmployees: 1000,
  _count: { subscriptions: 3 },
};
const invoice = {
  id: "80000000-0000-4000-8000-000000000301",
  invoiceNumber: "DCRM/FY2026-27/000081",
  status: "OPEN",
  subtotalAmount: "7475.00",
  taxAmount: "1345.50",
  totalAmount: "8820.50",
  amountDue: "8820.50",
  currency: "INR",
  dueDate: "2026-07-25T00:00:00.000Z",
  issuedAt: "2026-07-18T00:00:00.000Z",
  pdfChecksum: "a".repeat(64),
  tenant: { id: tenantId, companyName: "Acme Logistics", subdomain: "acme" },
  subscription: { plan },
  lineItems: [
    {
      id: "line-1",
      description: "Growth subscription",
      quantity: "25",
      amount: "7475.00",
    },
  ],
  transactions: [],
};

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1024, height: 900 },
]) {
  test.describe(`Sprint 8 billing at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("completes the A2/A3 self-serve signup and verification screens", async ({
      page,
    }) => {
      await page.route("http://localhost:4001/auth/signup", (route) =>
        route.fulfill({
          status: 201,
          json: {
            message: "Workspace created. Verify your email to continue.",
            nextStep: "EMAIL_VERIFY",
            tenantId,
            email: "owner@harbour.example",
            subdomain: "harbour",
            emailDelivery: "SENT",
          },
        }),
      );
      await page.route("http://localhost:4001/auth/verify", (route) =>
        route.fulfill({
          status: 200,
          json: {
            message: "Token verified successfully",
            purpose: "EMAIL_VERIFY",
            email: "owner@harbour.example",
          },
        }),
      );

      await page.goto("/signup");
      await expect(
        page.getByRole("heading", { name: "Create your workspace" }),
      ).toBeVisible();
      await page.getByLabel("Company name").fill("Harbour Logistics");
      await page.getByLabel("Work email").fill("owner@harbour.example");
      await page.getByLabel("Password", { exact: true }).fill("Launch123!");
      await page.getByLabel("Employee count").selectOption("11-50");
      await page.getByLabel(/By creating a workspace/).check();
      await page.getByRole("button", { name: "Create workspace" }).click();

      await expect(page).toHaveURL(/\/verify-email\?/);
      await expect(
        page.getByRole("heading", { name: "Verify your email" }),
      ).toBeVisible();
      await page.locator("#verification-code").fill("123456");
      await page.getByRole("button", { name: "Verify", exact: true }).click();
      await expect(page).toHaveURL(/\/login\?/);
      await expectNoHorizontalOverflow(page);
    });

    test("renders B10 and completes a server-calculated plan preview", async ({
      page,
    }) => {
      await installTenantSession(page);
      await mockTenantShell(page);
      await mockTenantBilling(page);
      await page.goto("/app/settings/billing");

      await expect(
        page.getByRole("heading", { name: "Billing & subscription" }),
      ).toBeVisible();
      await expect(page.getByText("₹8,820.50").first()).toBeVisible();
      await expect(
        page.getByText("Growth", { exact: true }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: "Review change" }).click();
      await expect(
        page.getByRole("heading", { name: "Change to Enterprise" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Calculate preview" }).click();
      await expect(page.getByText("₹5,000.00")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await test.info().attach(`B10-${viewport.width}`, {
        body: await page.screenshot({
          fullPage: true,
          animations: "disabled",
        }),
        contentType: "image/png",
      });
    });

    test("renders S5-S8 plans, invoices, payments and dunning inside the platform shell", async ({
      page,
    }) => {
      await installPlatformSession(page);
      await mockPlatformBilling(page);

      await page.goto("/platform/plans");
      await expect(
        page.getByRole("heading", { name: "Plans & entitlements" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create plan" }),
      ).toBeVisible();
      await expect(page.getByText("Enterprise", { exact: true })).toBeVisible();

      await page.goto("/platform/billing/invoices");
      await expect(page.getByText(invoice.invoiceNumber)).toBeVisible();
      await page.getByRole("button", { name: "Inspect" }).click();
      await expect(
        page.getByRole("heading", { name: invoice.invoiceNumber }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close invoice detail" }).click();

      await page.goto("/platform/billing/payments");
      await expect(page.getByText("pay_acceptance_81")).toBeVisible();
      await expect(page.getByRole("cell", { name: "SUCCEEDED" })).toBeVisible();

      await page.goto("/platform/billing/dunning");
      await expect(page.getByText("GRACE", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Retry payment" }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await test.info().attach(`S5-S8-${viewport.width}`, {
        body: await page.screenshot({
          fullPage: true,
          animations: "disabled",
        }),
        contentType: "image/png",
      });
    });

    test("builds a plan in three clear steps and preserves feature dependencies", async ({
      page,
    }) => {
      await installPlatformSession(page);
      await mockPlatformBilling(page);
      await page.goto("/platform/plans");
      await page.getByRole("button", { name: "Create plan" }).click();
      await page.getByLabel("Plan name").fill("Operations Plus");
      await page.getByLabel("Price per employee").fill("349.00");
      await page.getByLabel("Maximum employees").fill("500");
      await page.getByRole("button", { name: /Continue/ }).click();
      await page
        .getByRole("checkbox", { name: /Attendance Time, presence/ })
        .check();
      await expect(
        page.getByText("Included with Attendance").first(),
      ).toBeVisible();
      await page
        .getByRole("checkbox", { name: /Advanced attendance reports/ })
        .check();
      await page.getByRole("button", { name: /Continue/ }).click();
      await expect(
        page.getByText("Attendance registers and basic reports").last(),
      ).toBeVisible();
      await expect(
        page.getByText("Advanced attendance reports").last(),
      ).toBeVisible();
      await expect(page.getByText("Field Workforce Tracking")).toHaveCount(0);
    });

    test("previews affected tenants before editing an in-use plan", async ({
      page,
    }) => {
      await installPlatformSession(page);
      await mockPlatformBilling(page);
      await page.goto("/platform/plans");
      await page.getByRole("button", { name: "Edit Growth" }).click();
      await page.getByRole("button", { name: /Continue/ }).click();
      await page.getByRole("button", { name: /Continue/ }).click();
      await expect(page.getByText("Plan change impact")).toBeVisible();
      await expect(page.getByText(/8 active tenants/)).toBeVisible();
    });

    test("shows products, Attendance add-ons, capabilities, and future products separately", async ({
      page,
    }) => {
      await installPlatformSession(page);
      await mockPlatformBilling(page);
      await page.route("http://localhost:4001/platform/tenants?**", (route) =>
        route.fulfill({
          json: {
            data: [
              {
                id: tenantId,
                companyName: "Acme Logistics",
                subdomain: "acme",
                status: "ACTIVE",
                createdAt: "2026-01-01T00:00:00.000Z",
                employees: 25,
                subscription: { status: "ACTIVE", seatCount: 25, plan },
                modules: [{ key: "ATTENDANCE", name: "Attendance" }],
              },
            ],
            pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
          },
        }),
      );
      await page.goto("/platform/modules");
      await expect(
        page.getByRole("heading", { name: "Products & entitlements" }),
      ).toBeVisible();
      await expect(page.getByText("Attendance Regularization")).toHaveCount(0);
      await expect(
        page.getByText("Attendance correction requests"),
      ).toBeVisible();
      await expect(
        page.getByText("Field Workforce Tracking").first(),
      ).toBeVisible();
      await expect(page.getByText("Leave Management")).toBeVisible();
      await expect(page.getByText("Not sellable").first()).toBeVisible();
    });

    test("schedules a legally held tenant deletion from the platform danger zone", async ({
      page,
    }) => {
      await installPlatformSession(page);
      await mockTenantDeletion(page);
      await page.goto(`/platform/tenants/${tenantId}`);

      await expect(page.getByText("Danger Zone")).toBeVisible();
      await page.getByRole("button", { name: "Schedule deletion" }).click();
      await expect(
        page.getByRole("heading", { name: "Schedule tenant deletion?" }),
      ).toBeVisible();
      await page
        .getByLabel("Auditable reason")
        .fill("Customer contract ended and deletion was formally approved");
      await page.getByLabel(/Legal hold until/).fill("2027-01-01T09:00");
      await page.getByRole("button", { name: "Suspend and schedule" }).click();

      await expect(page.getByText("LEGAL HOLD", { exact: true })).toBeVisible();
      await expect(page.getByText(/Legal hold until/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Schedule deletion" }),
      ).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    });

    test("shows plan features and saves an audited tenant override", async ({
      page,
    }) => {
      await installPlatformSession(page);
      await mockTenantDeletion(page);
      await page.goto(`/platform/tenants/${tenantId}`);

      await expect(page.getByText("Products and features")).toBeVisible();
      await expect(
        page.getByText("Attendance correction requests"),
      ).toBeVisible();
      await page.getByRole("button", { name: "Manage overrides" }).click();
      await page
        .getByLabel(/Attendance correction requests/)
        .selectOption("ENABLE");
      await page
        .getByLabel("Reason for this tenant exception")
        .fill("Approved pilot access for this customer tenant");
      await page.getByRole("button", { name: "Save overrides" }).click();

      await expect(page.getByText(/Tenant override/)).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });
}

async function installTenantSession(page: Page) {
  await page.addInitScript(
    ({ id }) => {
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user: {
              id: "tenant-admin",
              email: "admin@acme.com",
              tenantId: id,
              workspace: "acme",
              companyName: "Acme Logistics",
              roles: ["BUSINESS_ADMIN"],
              permissions: [
                "workspace.settings.read",
                "workspace.modules.read",
                "billing.subscription.read",
                "billing.subscription.manage",
                "billing.profile.manage",
                "billing.invoices.read",
                "billing.payment-methods.manage",
              ],
            },
            accessToken: "tenant-access",
            refreshToken: "tenant-refresh",
            pendingAuth: {
              tenantId: id,
              workspace: "acme",
              email: "admin@acme.com",
            },
          },
          version: 0,
        }),
      );
    },
    { id: tenantId },
  );
}

async function installPlatformSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "deltcrm-platform-auth",
      JSON.stringify({
        state: {
          user: {
            id: "platform-owner",
            email: "owner@deltcrm.test",
            role: "SUPER_ADMIN",
            permissions: [
              "platform.dashboard.read",
              "platform.plans.read",
              "platform.plans.manage",
              "platform.modules.read",
              "platform.modules.manage",
              "platform.billing.read",
              "platform.billing.manage",
              "platform.dunning.manage",
              "platform.health.read",
              "platform.tenants.read",
              "platform.tenants.lifecycle",
            ],
          },
          accessToken: "platform-access",
          refreshToken: "platform-refresh",
          impersonation: null,
        },
        version: 0,
      }),
    );
  });
}

async function mockTenantDeletion(page: Page) {
  let status = "ACTIVE";
  let deletion: Record<string, unknown> | null = null;
  let overrideReason: string | null = null;
  const detail = () => ({
    tenant: {
      id: tenantId,
      companyName: "Acme Logistics",
      subdomain: "acme",
      status,
      createdAt: "2026-01-01T00:00:00.000Z",
      settings: { timezone: "Asia/Dubai" },
    },
    subscription: { currentPeriodEnd: "2026-08-01T00:00:00.000Z", plan },
    usage: { employees: 25, seats: 30, percentage: 83 },
    modules: [{ key: "ATTENDANCE", name: "Attendance", isActive: true }],
    administratorInvitation: {
      email: "admin@acme.com",
      expiresAt: "2026-08-01T00:00:00.000Z",
      consumedAt: "2026-01-02T00:00:00.000Z",
    },
  });
  await page.route(
    `http://localhost:4001/platform/tenants/${tenantId}`,
    (route) => route.fulfill({ json: detail() }),
  );
  await page.route(
    `http://localhost:4001/platform/tenants/${tenantId}/deletion`,
    async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as {
          reason: string;
          legalHoldUntil: string;
        };
        status = "SUSPENDED";
        deletion = {
          id: "deletion-job-1",
          status: "LEGAL_HOLD",
          reason: body.reason,
          legalHoldUntil: body.legalHoldUntil,
          biometricPurgedAt: null,
          completedAt: null,
          failureCode: null,
          evidence: { billingAndAuditRetention: true },
        };
        await route.fulfill({
          status: 201,
          json: { data: deletion, replayed: false },
        });
        return;
      }
      await route.fulfill({ json: { data: deletion } });
    },
  );
  await page.route(
    `http://localhost:4001/platform/tenants/${tenantId}/entitlements**`,
    async (route) => {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON() as {
          overrides: Array<{ reason: string }>;
        };
        overrideReason = body.overrides[0]?.reason ?? null;
        await route.fulfill({ json: { data: { updated: true } } });
        return;
      }
      await route.fulfill({
        json: {
          data: {
            plan: { id: plan.id, name: plan.name },
            products: [
              {
                key: "ATTENDANCE",
                name: "Attendance",
                kind: "PRODUCT",
                active: true,
                source: "PLAN",
              },
            ],
            capabilities: [
              {
                id: "cap-regularization",
                moduleId: plan.modules[0].module.id,
                key: "ATTENDANCE_REGULARIZATION",
                name: "Attendance correction requests",
                description:
                  "Employee correction requests and approval workflow",
                availability: "AVAILABLE",
                isCore: false,
                configurable: true,
                requiredModuleKeys: ["ATTENDANCE"],
                dependencyKeys: ["ATTENDANCE_CORE"],
                conflictKeys: [],
                displayOrder: 70,
                included: true,
                source: overrideReason ? "OVERRIDE" : "PLAN",
                override: overrideReason
                  ? {
                      mode: "ENABLE",
                      reason: overrideReason,
                      startsAt: null,
                      endsAt: null,
                    }
                  : null,
              },
            ],
            overrides: [],
            limits: { employees: 250 },
          },
        },
      });
    },
  );
}

async function mockTenantShell(page: Page) {
  await page.route("**/workspace/modules", (route) =>
    route.fulfill({ json: { modules: [{ key: "ATTENDANCE" }] } }),
  );
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "tenant-admin",
          email: "admin@acme.com",
          roles: ["BUSINESS_ADMIN"],
          permissions: [
            "workspace.settings.read",
            "workspace.modules.read",
            "billing.subscription.read",
            "billing.subscription.manage",
            "billing.profile.manage",
            "billing.invoices.read",
            "billing.payment-methods.manage",
          ],
        },
        workspace: {
          id: tenantId,
          companyName: "Acme Logistics",
          subdomain: "acme",
          logoUrl: null,
        },
      },
    }),
  );
}

async function mockTenantBilling(page: Page) {
  await page.route("**/billing/profile", (route) =>
    route.fulfill({
      json: {
        data: {
          tenantId,
          legalName: "Acme Logistics Private Limited",
          billingEmail: "billing@acme.com",
          gstin: "27ABCDE1234F1Z5",
          pan: "ABCDE1234F",
          currency: "INR",
          address: {
            line1: "DeltCRM Acceptance Office",
            city: "Mumbai",
            state: "Maharashtra",
            postalCode: "400001",
            countryCode: "IN",
          },
        },
      },
    }),
  );
  await page.route("**/billing/subscription", (route) =>
    route.fulfill({
      json: {
        data: {
          id: "subscription-1",
          status: "ACTIVE",
          seatCount: 25,
          currentPeriodStart: "2026-07-01T00:00:00.000Z",
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          dunningState: "NONE",
          plan,
          availablePlans: [plan, enterprise],
          usage: { activeEmployees: 25, seats: 25, maximumEmployees: 250 },
        },
      },
    }),
  );
  await page.route("**/billing/invoices", (route) =>
    route.fulfill({
      json: { data: [invoice] },
    }),
  );
  await page.route("**/billing/payment-methods", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "method-1",
            gateway: "RAZORPAY",
            methodType: "CARD",
            displayName: "Business card",
            lastFour: "4242",
            isDefault: true,
            status: "ACTIVE",
          },
        ],
      },
    }),
  );
  await page.route("**/billing/subscription/change-plan", (route) =>
    route.fulfill({
      json: {
        data: {
          committed: false,
          preview: {
            currency: "INR",
            currentAmount: "7475.00",
            targetAmount: "12475.00",
            amountDue: "5000.00",
            creditAmount: "0.00",
            effectiveAt: "2026-08-01T00:00:00.000Z",
          },
        },
      },
    }),
  );
}

async function mockPlatformBilling(page: Page) {
  const paginated = (data: unknown[]) => ({
    data,
    pagination: {
      page: 1,
      limit: 50,
      total: data.length,
      totalPages: data.length ? 1 : 0,
    },
  });
  await page.route("http://localhost:4001/platform/catalog", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: plan.modules[0].module.id,
            key: "ATTENDANCE",
            name: "Attendance",
            description: "Time, presence, shifts and attendance operations",
            availability: "AVAILABLE",
            kind: "PRODUCT",
            parentModuleId: null,
            catalogOrder: 10,
            customerVisible: true,
            dependencyKeys: [],
            conflictKeys: [],
            addOns: [
              {
                id: "field-addon",
                key: "FIELD_TRACKING",
                name: "Field Workforce Tracking",
                description: "Location-aware field workforce operations",
                availability: "AVAILABLE",
                kind: "ADD_ON",
                parentModuleId: plan.modules[0].module.id,
                catalogOrder: 20,
                customerVisible: true,
                dependencyKeys: ["ATTENDANCE"],
                conflictKeys: [],
              },
            ],
            capabilities: [
              ...plan.capabilities.map(({ capability }) => ({
                ...capability,
                moduleId: plan.modules[0].module.id,
                description: capability.name,
                availability: "AVAILABLE",
                configurable: true,
                conflictKeys: [],
                displayOrder: capability.isCore ? 10 : 20,
              })),
              {
                id: "cap-regularization",
                moduleId: plan.modules[0].module.id,
                key: "ATTENDANCE_REGULARIZATION",
                name: "Attendance correction requests",
                description:
                  "Employee correction requests and approval workflow",
                availability: "AVAILABLE",
                isCore: false,
                configurable: true,
                requiredModuleKeys: ["ATTENDANCE"],
                dependencyKeys: ["ATTENDANCE_CORE"],
                conflictKeys: [],
                displayOrder: 70,
              },
              {
                id: "cap-advanced",
                moduleId: plan.modules[0].module.id,
                key: "ATTENDANCE_REPORTS_ADVANCED",
                name: "Advanced attendance reports",
                description: "Late, overtime and violation reporting",
                availability: "AVAILABLE",
                isCore: false,
                configurable: false,
                requiredModuleKeys: ["ATTENDANCE"],
                dependencyKeys: ["ATTENDANCE_REPORTS_BASIC"],
                conflictKeys: [],
                displayOrder: 80,
              },
            ],
          },
          {
            id: "leave-module",
            key: "LEAVE",
            name: "Leave Management",
            description: "Future leave product",
            availability: "COMING_SOON",
            kind: "PRODUCT",
            parentModuleId: null,
            catalogOrder: 100,
            customerVisible: true,
            dependencyKeys: [],
            conflictKeys: [],
            addOns: [],
            capabilities: [],
          },
          {
            id: "payroll-module",
            key: "PAYROLL",
            name: "Payroll",
            description: "Future payroll product",
            availability: "COMING_SOON",
            kind: "PRODUCT",
            parentModuleId: null,
            catalogOrder: 110,
            customerVisible: true,
            dependencyKeys: [],
            conflictKeys: [],
            addOns: [],
            capabilities: [],
          },
        ],
      },
    }),
  );
  await page.route("http://localhost:4001/platform/plans", (route) =>
    route.fulfill({ json: { data: [plan, enterprise] } }),
  );
  await page.route(
    `http://localhost:4001/platform/plans/${plan.id}/impact`,
    (route) =>
      route.fulfill({
        status: 201,
        json: {
          data: {
            affectedTenantCount: 8,
            affectedTenants: [],
            addedModuleKeys: [],
            removedModuleKeys: [],
            addedCapabilityKeys: [],
            removedCapabilityKeys: [],
            tenantsOverEmployeeLimit: 0,
            autoIncludedCapabilityKeys: [],
          },
        },
      }),
  );
  await page.route("http://localhost:4001/platform/invoices?**", (route) =>
    route.fulfill({ json: paginated([invoice]) }),
  );
  await page.route(
    `http://localhost:4001/platform/invoices/${invoice.id}`,
    (route) => route.fulfill({ json: { data: invoice } }),
  );
  await page.route(
    "http://localhost:4001/platform/payment-transactions?**",
    (route) =>
      route.fulfill({
        json: paginated([
          {
            id: "payment-1",
            gateway: "RAZORPAY",
            gatewayRef: "pay_acceptance_81",
            status: "SUCCEEDED",
            amount: "8820.50",
            currency: "INR",
            attemptedAt: "2026-07-18T00:00:00.000Z",
            invoice,
          },
        ]),
      }),
  );
  await page.route("http://localhost:4001/platform/dunning?**", (route) =>
    route.fulfill({
      json: paginated([
        {
          id: "subscription-1",
          status: "PAST_DUE",
          seatCount: 25,
          currentPeriodStart: "2026-07-01T00:00:00.000Z",
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          dunningState: "GRACE",
          plan,
          availablePlans: [plan],
          usage: { activeEmployees: 25, seats: 25, maximumEmployees: 250 },
          tenant: {
            id: tenantId,
            companyName: "Acme Logistics",
            subdomain: "acme",
            status: "ACTIVE",
          },
          invoices: [invoice],
          dunningHistory: [
            {
              id: "transition-1",
              action: "GRACE_STARTED",
              fromState: "REMINDED",
              toState: "GRACE",
              reason: "Reminder elapsed; grace period started",
              createdAt: "2026-07-18T00:00:00.000Z",
            },
          ],
        },
      ]),
    }),
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
