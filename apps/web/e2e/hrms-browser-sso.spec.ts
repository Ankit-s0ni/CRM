import { expect, test } from "@playwright/test";

const email = process.env.PLATFORM_TEST_EMAIL ?? "admin@acme.com";
const password = process.env.PLATFORM_TEST_PASSWORD ?? "TenantAdmin123!";
const workspace = process.env.PLATFORM_TEST_WORKSPACE ?? "acme";

test("preserves the tenant session across canonical HRMS deep links", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto(`/login?workspace=${workspace}`);
  await page.getByLabel("Email Address").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/app(?:\/onboarding)?$/);

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
  expect(runtimeErrors).toEqual([]);
});
