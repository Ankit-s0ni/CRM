import { expect, test } from "@playwright/test";

const email = process.env.PLATFORM_TEST_EMAIL ?? "admin@acme.com";
const password =
  process.env.PLATFORM_TEST_PASSWORD ??
  process.env.ACME_ADMIN_PASSWORD ??
  process.env.ACME_PASSWORD ??
  "TenantAdmin123!";
const workspace = process.env.PLATFORM_TEST_WORKSPACE ?? "acme";

function isExpectedOptionalResourceMiss(
  status: number,
  pathname: string,
): boolean {
  return (
    status === 404 &&
    /^\/api\/hrms\/v1\/payroll\/employees\/[^/]+\/profile$/u.test(pathname)
  );
}

test("preserves the tenant session across canonical HRMS deep links", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  const unscopedHrmsApiRequests: string[] = [];
  const failedHrmsApiRequests: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      url.origin === "http://localhost:4080" &&
      url.pathname.startsWith("/api/hrms/") &&
      !isExpectedOptionalResourceMiss(response.status(), url.pathname) &&
      response.status() >= 400
    ) {
      failedHrmsApiRequests.push(
        `${response.request().method()} ${url.pathname} ${response.status()}`,
      );
    }
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === "http://localhost:4080" && url.pathname === "/employees") {
      unscopedHrmsApiRequests.push(url.href);
    }
  });

  await page.goto(`/login?workspace=${workspace}`);
  await page.getByLabel("Email Address").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/app(?:\/onboarding)?$/);

  await page.goto("/en/app");
  const hrmsProductLink = page.getByRole("link", { name: /HRMS/i }).first();
  await expect(hrmsProductLink).toHaveAttribute("href", "/en/app/hrms");
  await hrmsProductLink.click();
  await expect(page).toHaveURL(/\/en\/app\/hrms$/);
  await expect(
    page.getByRole("heading", { name: "Attendance overview" }),
  ).toBeVisible();
  await expect.soft(page.locator("body")).not.toContainText(
    "Attendance priorities could not be loaded",
  );
  await expect(page.locator("body")).not.toContainText(
    "Welcome to Acme Logistics",
  );

  const productNavigation = page.getByRole("navigation").first();
  for (const item of [
    { label: "Employees", path: "/en/app/hrms/employees" },
    { label: "Attendance", path: "/en/app/hrms/attendance" },
    { label: "Payroll", path: "/en/app/hrms/payroll" },
    { label: "Reports", path: "/en/app/hrms/reports" },
    { label: "Settings", path: "/en/app/hrms/settings" },
  ]) {
    const link = productNavigation.getByRole("link", {
      name: item.label,
      exact: true,
    });
    if ((await link.count()) === 0) continue;
    const employeeApiResponse =
      item.label === "Employees"
        ? page.waitForResponse((response) => {
            const url = new URL(response.url());
            return (
              response.request().method() === "GET" &&
              url.pathname === "/api/hrms/v1/employees"
            );
          })
        : null;
    await link.click();
    await expect(page).toHaveURL(item.path);
    if (employeeApiResponse) {
      expect((await employeeApiResponse).status()).toBe(200);
      await expect(page.locator("body")).not.toContainText("No employees");
    }
    if (item.label === "Attendance") {
      await expect.soft(page.locator("body")).not.toContainText(
        "Attendance access denied",
      );
    }
    if (item.label === "Reports") {
      await expect.soft(page.locator("body")).not.toContainText(
        "Report jobs could not be loaded",
      );
    }
    await expect(page.locator("body")).not.toContainText(
      "This page could not be found",
    );
  }

  await page.goto("/en/app/hrms/attendance/policies");
  await expect(page).toHaveURL(/\/en\/app\/hrms\/attendance\/policies$/);
  await expect(page.locator("body")).not.toContainText("Email Address");

  await page.reload();
  await expect(page).toHaveURL(/\/en\/app\/hrms\/attendance\/policies$/);
  await expect(page.locator("body")).not.toContainText("Email Address");

  await page.goto("/ar/app/hrms/attendance/policies");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("body")).not.toContainText("Email Address");

  await page.goto("/en/app/hrms/payroll");
  await expect(page).toHaveURL(/\/en\/app\/hrms\/payroll$/);
  await expect(page.locator("body")).not.toContainText("Email Address");
  expect(unscopedHrmsApiRequests).toEqual([]);
  expect(failedHrmsApiRequests).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test("all HRMS screens avoid missing and failing API routes", async ({ page }) => {
  test.setTimeout(120_000);
  const apiFailures = new Set<string>();
  const pageFailures = new Set<string>();
  const runtimeErrors = new Set<string>();

  // Full document navigations below are the routes under test. Disable Link
  // visibility prefetches so a 36-screen crawl does not create hundreds of
  // unrelated RSC requests against the single-process local frontend.
  await page.route("**/*", async (route) => {
    const headers = route.request().headers();
    if (headers["next-router-prefetch"] === "1" || headers.purpose === "prefetch") {
      await route.abort();
      return;
    }
    await route.continue();
  });

  page.on("pageerror", (error) =>
    runtimeErrors.add(`${page.url()}: ${error.message}`),
  );
  page.on("response", (response) => {
    const url = new URL(response.url());
    const expectedEntitlementMiss =
      response.status() === 404 &&
      /^\/workspace\/modules\/[^/]+\/health$/u.test(url.pathname);
    const expectedOptionalResourceMiss = isExpectedOptionalResourceMiss(
      response.status(),
      url.pathname,
    );
    if (
      url.origin === "http://localhost:4080" &&
      !expectedEntitlementMiss &&
      !expectedOptionalResourceMiss &&
      (response.status() === 404 || response.status() >= 500)
    ) {
      apiFailures.add(
        `${response.request().method()} ${url.pathname}${url.search} ${response.status()}`,
      );
    }
  });

  await page.goto(`/login?workspace=${workspace}`);
  await page.getByLabel("Email Address").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/app(?:\/onboarding)?$/);
  await page.goto("/en/app", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});

  const routes = [
    "/en/app/hrms",
    "/en/app/hrms/employees",
    "/en/app/hrms/employees/new",
    "/en/app/hrms/employees/import",
    "/en/app/hrms/employees/organization",
    "/en/app/hrms/attendance",
    "/en/app/hrms/attendance/register",
    "/en/app/hrms/attendance/requests",
    "/en/app/hrms/attendance/leave/requests",
    "/en/app/hrms/attendance/exceptions",
    "/en/app/hrms/attendance/regularizations",
    "/en/app/hrms/attendance/field",
    "/en/app/hrms/attendance/reports",
    "/en/app/hrms/attendance/payroll",
    "/en/app/hrms/attendance/setup",
    "/en/app/hrms/attendance/policies",
    "/en/app/hrms/attendance/shifts",
    "/en/app/hrms/attendance/rosters",
    "/en/app/hrms/attendance/offices",
    "/en/app/hrms/attendance/holidays",
    "/en/app/hrms/attendance/devices",
    "/en/app/hrms/attendance/security",
    "/en/app/hrms/attendance/setup/leave",
    "/en/app/hrms/payroll",
    "/en/app/hrms/payroll/runs",
    "/en/app/hrms/reports",
    "/en/app/hrms/settings",
    "/en/app/hrms/settings/company",
    "/en/app/hrms/settings/access",
    "/en/app/hrms/settings/attendance",
    "/en/app/hrms/settings/payroll",
    "/en/app/hrms/settings/security",
    "/en/app/hrms/settings/notifications",
    "/en/app/hrms/settings/integrations",
    "/en/app/hrms/settings/audit",
    "/en/app/hrms/settings/localization",
  ];

  for (const route of routes) {
    await page
      .goto(route, { waitUntil: "load" })
      .catch(async (error: Error) => {
        if (!error.message.includes("ERR_ABORTED")) throw error;
        await page.waitForTimeout(250);
        await page.goto(route, { waitUntil: "load" });
      });
    const body = await page.locator("body").innerText();
    if (/Cannot (GET|POST|PUT|PATCH|DELETE) \/api\//u.test(body)) {
      pageFailures.add(`${route}: ${body.match(/Cannot (?:GET|POST|PUT|PATCH|DELETE) \/api\/[^\n]*/u)?.[0]}`);
    }
    if (body.includes("This page could not be found")) {
      pageFailures.add(`${route}: page not found`);
    }
    const visibleLoadError = body.match(
      /[^\n]*(?:could not be loaded|failed to load)[^\n]*/iu,
    )?.[0];
    if (visibleLoadError) {
      pageFailures.add(`${route}: ${visibleLoadError.trim()}`);
    }
  }

  expect([...apiFailures]).toEqual([]);
  expect([...pageFailures]).toEqual([]);
  expect([...runtimeErrors]).toEqual([]);
});

test("employee and attendance record deep links load their data", async ({ page }) => {
  const failures: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      url.origin === "http://localhost:4080" &&
      url.pathname.startsWith("/api/hrms/") &&
      !isExpectedOptionalResourceMiss(response.status(), url.pathname) &&
      response.status() >= 400
    ) {
      failures.push(
        `${response.request().method()} ${url.pathname}${url.search} ${response.status()}`,
      );
    }
  });

  await page.goto(`/login?workspace=${workspace}`);
  await page.getByLabel("Email Address").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/app(?:\/onboarding)?$/);
  await page.goto("/en/app", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});

  await page.goto("/en/app/hrms/employees");
  const employeeHref = await page
    .locator('a[href*="/app/"][href*="/employees/"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((href) =>
          /\/app\/(?:hrms\/)?employees\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:[?#]|$)/i.test(
            href ?? "",
          ),
        ),
    );
  const seededEmployeeId =
    process.env.HRMS_E2E_EMPLOYEE_ID ??
    "019fa35c-df73-7709-91a1-2d95d361d4f7";
  await page.goto(
    employeeHref ?? `/en/app/hrms/employees/${seededEmployeeId}`,
  );
  await expect(page.locator("body")).not.toContainText(
    "Employee details could not be loaded.",
  );
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "Employee history" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Cannot GET");

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  await page.goto(
    `/en/app/hrms/attendance/register?startDate=${monthStart}&endDate=${today}`,
  );
  const attendanceLink = page
    .locator('a[href*="/app/hrms/attendance/register/"]')
    .first();
  await expect(attendanceLink).toBeVisible();
  await attendanceLink.click();
  await expect(page.getByRole("heading", { name: /attendance/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "Employee attendance could not be loaded",
  );
  expect(failures).toEqual([]);
});
