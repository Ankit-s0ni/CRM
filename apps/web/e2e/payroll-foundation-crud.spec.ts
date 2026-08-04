import { expect, test, type Page } from "@playwright/test";

const tenantId = "90000000-0000-4000-8000-000000000001";
const employeeId = "90000000-0000-4000-8000-000000000101";
const calendarId = "90000000-0000-4000-8000-000000000201";
const policyId = "90000000-0000-4000-8000-000000000301";
const policyVersionId = "90000000-0000-4000-8000-000000000302";
const componentId = "90000000-0000-4000-8000-000000000401";
const componentVersionId = "90000000-0000-4000-8000-000000000402";
const structureId = "90000000-0000-4000-8000-000000000501";
const structureVersionId = "90000000-0000-4000-8000-000000000502";

test("runs focused Payroll Phase 1 browser CRUD workflows", async ({ page }) => {
  const calls: string[] = [];
  await installPayrollSession(page, adminPermissions);
  await mockPayrollApis(page, calls);

  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/app/modules/payroll/foundation");

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Default Currency").fill("OMR");
  await page.getByRole("button", { name: "Create settings" }).click();
  await expect(page.getByText("Saved.").first()).toBeVisible();
  await page.getByRole("button", { name: "Save settings" }).click();

  await page.getByRole("button", { name: "Calendars" }).click();
  await page.getByRole("button", { name: "Create calendar" }).click();
  await page.getByRole("button", { name: "Activate" }).first().click();

  await page.getByRole("button", { name: "Policies" }).click();
  await page.getByRole("button", { name: "Create policy" }).click();
  await page.getByLabel("Policy ID").fill(policyId);
  await page.getByRole("button", { name: "Create version" }).click();

  await page.getByRole("button", { name: "Components" }).click();
  await page.getByRole("button", { name: "Create component" }).click();
  await page.getByLabel("Component Id").fill(componentId);
  await page.getByRole("button", { name: "Create version" }).click();
  await page.getByRole("button", { name: "Activate latest" }).click();

  await page.getByRole("button", { name: "Structures" }).click();
  await page.getByRole("button", { name: "Create structure" }).click();
  await page.getByLabel("Structure Id").fill(structureId);
  await page.getByRole("button", { name: "Create version" }).click();
  await page.getByLabel("Version Id").fill(structureVersionId);
  await page.getByLabel("Pay Component Version Id").fill(componentVersionId);
  await page.getByRole("button", { name: "Add component" }).click();
  await page.getByRole("button", { name: "Activate latest" }).click();

  await page.getByRole("button", { name: "Employee profile" }).click();
  await page.getByLabel("Employee ID").fill(employeeId);
  await page.getByRole("button", { name: "Create profile" }).click();

  await page.getByRole("button", { name: "Compensation" }).click();
  await page.getByLabel("Employee ID").fill(employeeId);
  await page.getByLabel("Salary Structure Version Id").fill(structureVersionId);
  await page.getByLabel("Amount").fill("1234.567");
  await page.getByRole("button", { name: "Create compensation revision" }).click();

  await page.getByRole("button", { name: "Payment details" }).click();
  await page.getByLabel("Employee ID").fill(employeeId);
  await page.getByLabel("Bank Name").fill("Bank Muscat");
  await page.getByLabel("Account Holder Name").fill("Payroll User");
  await page.getByLabel("Account Number").fill("BANK-ACCOUNT-998877");
  await page.getByRole("button", { name: "Save protected payment details" }).click();
  await expect(page.getByText("****8877")).toBeVisible();
  await expect(page.getByText("BANK-ACCOUNT-998877")).toHaveCount(0);

  await expect.poll(() => calls).toContain("POST /payroll/settings");
  expect(calls).toEqual(
    expect.arrayContaining([
      "PATCH /payroll/settings",
      `POST /payroll/calendars/${calendarId}/activate`,
      `POST /payroll/policies/${policyId}/versions`,
      `POST /payroll/components/${componentId}/versions`,
      `POST /payroll/components/${componentId}/versions/${componentVersionId}/activate`,
      `POST /payroll/salary-structures/versions/${structureVersionId}/components`,
      `POST /payroll/employees/${employeeId}/profile`,
      `POST /payroll/employees/${employeeId}/compensation`,
      `POST /payroll/employees/${employeeId}/payment-details`,
    ]),
  );
});

test("hides unauthorized Payroll protected-data actions", async ({ page }) => {
  await installPayrollSession(
    page,
    adminPermissions.filter((permission) => !permission.includes("protected-data")),
  );
  await mockPayrollApis(page, []);

  await page.goto("/app/modules/payroll/foundation");
  await expect(page.getByRole("button", { name: "Payment details" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Statutory details" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Compensation" })).toBeVisible();
});

async function installPayrollSession(page: Page, permissions: string[]) {
  await page.addInitScript(
    ({ id, permissionList }) => {
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user: {
              id: "payroll-admin",
              email: "payroll@example.test",
              tenantId: id,
              workspace: "acme",
              companyName: "Acme Logistics",
              roles: ["PAYROLL_ADMIN"],
              permissions: permissionList,
            },
            accessToken: "payroll-access",
            refreshToken: "payroll-refresh",
            pendingAuth: {
              tenantId: id,
              workspace: "acme",
              email: "payroll@example.test",
            },
          },
          version: 0,
        }),
      );
    },
    { id: tenantId, permissionList: permissions },
  );
}

async function mockPayrollApis(page: Page, calls: string[]) {
  const state = {
    settingsCreated: false,
    calendarActive: false,
    policyVersionCreated: false,
    componentVersionCreated: false,
    componentActive: false,
    structureVersionCreated: false,
    structureActive: false,
    profileCreated: false,
    compensationCreated: false,
    paymentCreated: false,
  };

  await page.route("http://localhost:4001/payroll/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    calls.push(key);

    if (request.method() !== "GET") {
      mutateState(url.pathname, state);
    }

    await route.fulfill({
      status: request.method() === "POST" ? 201 : 200,
      json: responseFor(url.pathname, state),
    });
  });
}

function mutateState(path: string, state: Record<string, boolean>) {
  if (path === "/payroll/settings") state.settingsCreated = true;
  if (path.endsWith("/activate") && path.includes("/calendars/")) {
    state.calendarActive = true;
  }
  if (path.endsWith("/versions") && path.includes("/policies/")) {
    state.policyVersionCreated = true;
  }
  if (path.endsWith("/versions") && path.includes("/components/")) {
    state.componentVersionCreated = true;
  }
  if (path.endsWith("/activate") && path.includes("/components/")) {
    state.componentActive = true;
  }
  if (path.endsWith("/versions") && path.includes("/salary-structures/")) {
    state.structureVersionCreated = true;
  }
  if (path.endsWith("/components") && path.includes("/salary-structures/versions/")) {
    state.structureVersionCreated = true;
  }
  if (path.endsWith("/activate") && path.includes("/salary-structures/")) {
    state.structureActive = true;
  }
  if (path.endsWith("/profile")) state.profileCreated = true;
  if (path.endsWith("/compensation")) state.compensationCreated = true;
  if (path.endsWith("/payment-details")) state.paymentCreated = true;
}

function responseFor(path: string, state: Record<string, boolean>) {
  if (path === "/payroll/settings") {
    return state.settingsCreated
      ? {
          data: {
            id: "settings-1",
            countryCode: "OM",
            defaultCurrency: "OMR",
            payFrequency: "MONTHLY",
            moduleStatus: "ACTIVE",
            workingDayBasis: "CALENDAR_DAYS",
            version: 1,
          },
        }
      : { data: null };
  }
  if (path === "/payroll/calendars") {
    return {
      data: [
        {
          id: calendarId,
          code: "MONTHLY_26_25",
          name: "Monthly 26 to 25",
          frequency: "MONTHLY",
          status: state.calendarActive ? "ACTIVE" : "DRAFT",
          version: 1,
          effectiveFrom: "2026-01-01",
        },
      ],
    };
  }
  if (path === "/payroll/policies") {
    return {
      data: [
        {
          id: policyId,
          code: "PRORATION_DEFAULT",
          name: "Default proration",
          category: "PRORATION",
          status: "ACTIVE",
          versions: state.policyVersionCreated ? [{ id: policyVersionId, version: 1 }] : [],
        },
      ],
    };
  }
  if (path === "/payroll/components") {
    return {
      data: [
        {
          id: componentId,
          code: "BASIC",
          name: "Basic salary",
          type: "EARNING",
          status: "ACTIVE",
          versions: state.componentVersionCreated
            ? [{ id: componentVersionId, version: 1, status: state.componentActive ? "ACTIVE" : "DRAFT" }]
            : [],
        },
      ],
    };
  }
  if (path === "/payroll/salary-structures") {
    return {
      data: [
        {
          id: structureId,
          code: "OM_MONTHLY",
          name: "Oman monthly salary",
          currency: "OMR",
          status: "ACTIVE",
          versions: state.structureVersionCreated
            ? [{ id: structureVersionId, version: 1, status: state.structureActive ? "ACTIVE" : "DRAFT" }]
            : [],
        },
      ],
    };
  }
  if (path.endsWith("/profile")) {
    return state.profileCreated
      ? {
          data: {
            id: "profile-1",
            employeeId,
            payrollStatus: "ACTIVE",
            payrollCountry: "OM",
            paymentMethod: "BANK_TRANSFER",
            salaryHold: false,
            version: 1,
          },
        }
      : { data: null };
  }
  if (path.endsWith("/compensation/history")) {
    return state.compensationCreated
      ? {
          data: [
            {
              id: "comp-1",
              salaryStructureVersionId: structureVersionId,
              baseAmountMinor: "1234567",
              currency: "OMR",
              effectiveFrom: "2026-01-01",
              version: 1,
              reason: "Payroll Phase 1 compensation revision",
            },
          ],
        }
      : { data: [] };
  }
  if (path.endsWith("/payment-details")) {
    return state.paymentCreated
      ? {
          data: [
            {
              id: "payment-1",
              paymentMethod: "BANK_TRANSFER",
              bankName: "Bank Muscat",
              accountHolderName: "Payroll User",
              accountNumberMasked: "****8877",
              status: "ACTIVE",
              version: 1,
            },
          ],
        }
      : { data: [] };
  }
  return { data: { id: responseId(path), version: 1, status: "ACTIVE" } };
}

function responseId(path: string) {
  if (path.includes("/calendars")) return calendarId;
  if (path.includes("/policies") && path.endsWith("/versions")) return policyVersionId;
  if (path.includes("/policies")) return policyId;
  if (path.includes("/components") && path.endsWith("/versions")) return componentVersionId;
  if (path.includes("/components")) return componentId;
  if (path.includes("/salary-structures") && path.endsWith("/versions")) return structureVersionId;
  if (path.includes("/salary-structures")) return structureId;
  return "payroll-response-id";
}

const adminPermissions = [
  "payroll.settings.read",
  "payroll.settings.manage",
  "payroll.policies.read",
  "payroll.policies.manage",
  "payroll.components.read",
  "payroll.components.manage",
  "payroll.structures.read",
  "payroll.structures.manage",
  "payroll.compensation.read",
  "payroll.compensation.manage",
  "payroll.protected-data.read",
  "payroll.protected-data.manage",
  "payroll.accounting.read",
  "payroll.accounting.manage",
  "payroll.audit.read",
];
