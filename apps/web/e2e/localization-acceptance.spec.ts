import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  languageFromPathname,
  replacePathLanguage,
  resolveTenantLoginDestination,
  safeLocalizedNextPath,
  stripLanguagePrefix,
} from "../src/lib/tenant-routes";

const runtimeErrors = new WeakMap<Page, string[]>();

test.describe("localized route helpers", () => {
  test("parses and replaces only supported URL language prefixes", () => {
    expect(languageFromPathname("/ar/app/employees")).toBe("ar");
    expect(languageFromPathname("/fr/app/employees")).toBeNull();
    expect(stripLanguagePrefix("/en/app/employees/123")).toBe(
      "/app/employees/123",
    );
    expect(replacePathLanguage("/en/app/employees/123", "ar")).toBe(
      "/ar/app/employees/123",
    );
  });

  test("accepts only safe localized tenant next paths", () => {
    expect(
      safeLocalizedNextPath("/ar/app/employees?page=2&status=ACTIVE"),
    ).toBe("/ar/app/employees?page=2&status=ACTIVE");
    expect(safeLocalizedNextPath("//malicious.example/app")).toBeNull();
    expect(safeLocalizedNextPath("/en/platform")).toBeNull();
  });

  test("resolves login destination in policy order", () => {
    expect(
      resolveTenantLoginDestination({
        nextPath: "/ar/app/employees/123?tab=attendance",
        savedLanguage: "en",
        defaultLanguage: "en",
        enabledLanguages: ["en", "ar"],
      }),
    ).toBe("/ar/app/employees/123?tab=attendance");
    expect(
      resolveTenantLoginDestination({
        savedLanguage: "ar",
        defaultLanguage: "en",
        enabledLanguages: ["en", "ar"],
      }),
    ).toBe("/ar/app/onboarding");
    expect(
      resolveTenantLoginDestination({
        nextPath: "/ar/app/employees",
        savedLanguage: "ar",
        defaultLanguage: "en",
        enabledLanguages: ["en"],
      }),
    ).toBe("/en/app/onboarding");
  });
});

test.describe("tenant URL localization", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page, request }) => {
    monitorRuntimeErrors(page);
    await configureTenantRegionalLocale(request, "ar-OM");
    await loginTenant(page);
  });

  test.afterEach(async ({ page, request }) => {
    expectRuntimeClean(page);
    await configureTenantRegionalLocale(request, "ar");
  });

  test("switches between English and Arabic without exposing regional codes", async ({
    page,
  }) => {
    await page.goto("/en/app/settings/localization");
    await expect(
      page.getByRole("heading", { name: "Language & localization" }),
    ).toBeVisible();

    const defaultLanguage = page.getByLabel("Default language");
    await expect(defaultLanguage.locator("option")).toHaveText([
      "English",
      "العربية",
    ]);
    await expect(page.getByText("العربية (عُمان)").first()).toBeVisible();
    await page.getByRole("button", { name: "Switch to Arabic" }).click();

    await page.waitForURL(/\/ar\/app\/settings\/localization$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoPageOverflow(page);

    await page.getByRole("button", { name: "Switch to English" }).click();
    await page.waitForURL(/\/en\/app\/settings\/localization$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("preserves filters and pagination while changing language", async ({
    page,
  }) => {
    await page.goto("/en/app/employees?page=2&status=ACTIVE");
    await page.getByRole("button", { name: "Switch to Arabic" }).click();
    await page.waitForURL(
      /\/ar\/app\/employees\?page=2&status=ACTIVE$/,
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("redirects a legacy tenant bookmark to a localized URL", async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: "deltcrm-language",
        value: "ar",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/app/employees?status=ACTIVE");
    await page.waitForURL(/\/ar\/app\/employees\?status=ACTIVE$/);
  });

  test("keeps the Arabic dashboard usable at a mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ar/app");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoPageOverflow(page);
  });
});

test("platform localization center exposes regional release controls", async ({
  page,
}) => {
  monitorRuntimeErrors(page);
  await page.goto("/platform/login");
  await page.getByLabel("Work email").fill("owner@deltcrm.local");
  await page.getByLabel("Password").fill("PlatformAdmin123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/platform(?:\/tenants)?$/);
  await page.goto("/platform/localization");

  await expect(
    page.getByRole("heading", { name: /Languages|Localization center/ }),
  ).toBeVisible();
  await expect(page.getByText("Arabic (Oman)")).toBeVisible();
  await expect(page.getByText("Arabic (UAE)")).toBeVisible();
  await expect(page.getByText("Current published release")).toBeVisible();
  expectRuntimeClean(page);
});

async function loginTenant(page: Page) {
  await page.goto("/login?workspace=acme");
  await page.getByLabel("Email Address").fill("admin@acme.com");
  await page.locator("#password").fill("TenantAdmin123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/app(?:\/onboarding)?$/);
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

function monitorRuntimeErrors(page: Page) {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  const capture = (message: string) => {
    if (
      /removeChild|hydration|Encountered a script tag|getSnapshot|Maximum update depth/i.test(
        message,
      )
    ) {
      errors.push(message);
    }
  };
  page.on("console", (message) => capture(message.text()));
  page.on("pageerror", (error) => capture(error.message));
}

function expectRuntimeClean(page: Page) {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
}

async function configureTenantRegionalLocale(
  request: APIRequestContext,
  regionalLocale: "ar" | "ar-OM" | "ar-AE",
) {
  const login = await request.post(
    "http://127.0.0.1:4001/platform/auth/login",
    {
      data: {
        email: "owner@deltcrm.local",
        password: "PlatformAdmin123!",
      },
    },
  );
  expect(login.ok()).toBeTruthy();
  const session = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const tenantsResponse = await request.get(
    "http://127.0.0.1:4001/platform/tenants?search=acme&limit=10",
    { headers },
  );
  const tenants = (await tenantsResponse.json()) as {
    data: Array<{ id: string; subdomain: string }>;
  };
  const tenant = tenants.data.find(({ subdomain }) => subdomain === "acme");
  expect(tenant).toBeTruthy();

  const policyResponse = await request.get(
    `http://127.0.0.1:4001/platform/localization/tenants/${tenant!.id}/policy`,
    { headers },
  );
  const current = (await policyResponse.json()) as {
    data: { policy: { allowTenantOverrides: boolean } };
  };
  const update = await request.patch(
    `http://127.0.0.1:4001/platform/localization/tenants/${tenant!.id}/policy`,
    {
      headers,
      data: {
        defaultLocale: "en",
        regionalLocale,
        enabledLocales: ["en", "ar"],
        allowUserPreference: true,
        allowTenantOverrides: current.data.policy.allowTenantOverrides,
        ...(regionalLocale === "ar"
          ? {}
          : { overrideReason: "Regional browser acceptance verification" }),
      },
    },
  );
  expect(update.ok()).toBeTruthy();
}
