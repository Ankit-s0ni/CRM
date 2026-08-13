# HRMS Onboarding Flow Corrective Implementation Plan

## Objective

Keep Platform account authentication separate from product onboarding, while making HRMS onboarding and setup state fully owned by HRMS.

## Correct flow

1. Signup creates the Platform tenant and owner account.
2. The user signs in at the tenant root `/login` URL.
3. Platform login opens the general workspace dashboard at `/{locale}/app`.
4. Selecting HRMS checks HRMS-owned onboarding status.
5. A new HRMS workspace opens `/{locale}/app/hrms/onboarding` without the normal application sidebar.
6. A completed HRMS workspace opens the HRMS dashboard.

## Corrective checklist

- [x] Canonicalize localized login URLs to `/login`.
- [x] Stop Platform login from redirecting directly into HRMS onboarding.
- [x] Move onboarding status and completion behind the HRMS product API.
- [x] Persist HRMS onboarding completion in the HRMS database.
- [x] Derive setup checklist readiness from tenant-scoped HRMS records.
- [x] Gate the HRMS product entry route using HRMS onboarding status.
- [x] Keep the HRMS onboarding page outside normal application chrome.
- [x] Request CSV for report jobs supported by the report worker.
- [ ] Run focused unit, routing, typecheck, lint, and production-build validation.
- [ ] Push Platform and HRMS commits.
- [ ] Deploy migrations, API, worker, and web applications.
- [ ] Verify login, Platform dashboard, HRMS onboarding, setup checklist, and reports in production.
