import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import {
  HRMS_ATTENDANCE_ROOT,
  HRMS_PAYROLL_ROOT,
  HRMS_SUBSCRIPTION_REQUIRED_PATH,
  HRMS_UNAUTHORIZED_PATH,
  HRMS_UNAVAILABLE_PATH,
  hrmsAccessStatePathForCode,
  hrmsRouteRewrites,
  toCanonicalHrmsPath,
  toLegacyHrmsPath,
} from "../src/lib/hrms-route-contract";
import { localizedTenantPath, replacePathLanguage } from "../src/lib/tenant-routes";
import { proxy } from "../src/proxy";

test("declares stable locale-aware HRMS gateway routes", () => {
  const rewrites = hrmsRouteRewrites();

  expect(rewrites).toContainEqual({
    source: "/:lang(en|ar)/app/hrms/attendance/:path*",
    destination: "/:lang/app/attendance/:path*",
  });
  expect(rewrites).toContainEqual({
    source: "/:lang(en|ar)/app/hrms/payroll/:path*",
    destination: "/:lang/app/modules/payroll/:path*",
  });
  expect(rewrites.every(({ source }) => source.startsWith("/:lang(en|ar)"))).toBe(
    true,
  );
});

test("keeps legacy bookmarks compatible while navigation uses canonical paths", () => {
  expect(toCanonicalHrmsPath("/app/modules/attendance")).toBe(
    HRMS_ATTENDANCE_ROOT,
  );
  expect(toCanonicalHrmsPath("/app/attendance/register/employee-1?day=2026-08-05")).toBe(
    `${HRMS_ATTENDANCE_ROOT}/register/employee-1?day=2026-08-05`,
  );
  expect(toCanonicalHrmsPath("/ar/app/modules/payroll/payslips")).toBe(
    `/ar${HRMS_PAYROLL_ROOT}/payslips`,
  );
  expect(toLegacyHrmsPath(`${HRMS_ATTENDANCE_ROOT}/policies`)).toBe(
    "/app/attendance/policies",
  );
  expect(toLegacyHrmsPath(`/en${HRMS_PAYROLL_ROOT}/runs#open`)).toBe(
    "/en/app/modules/payroll/runs#open",
  );
});

test("preserves locale while switching language on HRMS deep links", () => {
  expect(localizedTenantPath(`${HRMS_ATTENDANCE_ROOT}/register`, "ar")).toBe(
    `/ar${HRMS_ATTENDANCE_ROOT}/register`,
  );
  expect(
    replacePathLanguage(
      `/en${HRMS_PAYROLL_ROOT}/runs?period=2026-08`,
      "ar",
    ),
  ).toBe(`/ar${HRMS_PAYROLL_ROOT}/runs?period=2026-08`);
});

test("maps contract failures to controlled HRMS access states", () => {
  expect(hrmsAccessStatePathForCode("PRODUCT_PERMISSION_DENIED")).toBe(
    HRMS_UNAUTHORIZED_PATH,
  );
  expect(hrmsAccessStatePathForCode("PRODUCT_NOT_ENTITLED")).toBe(
    HRMS_SUBSCRIPTION_REQUIRED_PATH,
  );
  expect(hrmsAccessStatePathForCode("SERVICE_UNAVAILABLE")).toBe(
    HRMS_UNAVAILABLE_PATH,
  );
  expect(hrmsAccessStatePathForCode("UNKNOWN_ERROR")).toBeNull();
});

test("redirects an unsupported locale to the saved tenant language", () => {
  const response = proxy(
    new NextRequest(
      "https://acme.blufield.cloud/fr/app/hrms/payroll/runs?period=2026-08",
      { headers: { cookie: "deltcrm-language=ar" } },
    ),
  );

  expect(response.headers.get("location")).toBe(
    "https://acme.blufield.cloud/ar/app/hrms/payroll/runs?period=2026-08",
  );
});
