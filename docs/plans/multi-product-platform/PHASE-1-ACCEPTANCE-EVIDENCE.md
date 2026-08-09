# Phase 1 Product Integration Contract: Acceptance Evidence

**Branch:** `feature/product-integration-contract-phase-1`  
**Evidence date:** 2026-08-05  
**Overall status:** Local engineering implementation passes; external release and production-safety gates remain pending

## Safety Statement

Phase 1 changes contracts, application boundaries, routing, authorization and tests only. It does not move or delete HRMS data.

- No Prisma schema or migration was added by Phase 1.
- No production database command was executed.
- No seed, reset, truncate, drop, `prisma db push` or `prisma migrate reset` command was executed.
- Production reconciliation and restore-drill gates remain pending until an approved maintenance procedure is scheduled.

## Acceptance Matrix

| # | Acceptance criterion | Status | Evidence / required next action |
| - | -------------------- | ------ | ------------------------------- |
| 1 | Platform and product ownership is approved and documented | **Implemented; approval pending** | ADR-001 through ADR-005, `CURRENT-PLATFORM-HRMS-COUPLING-INVENTORY.md`, `HRMS-DATA-EXTRACTION-READINESS.md`, CODEOWNERS. Named Platform, HRMS, Security, DevOps and Data approvals must be recorded before extraction. |
| 2 | `deltcrm-contracts@1.0.0` is published with compatibility checks | **Package ready; publication pending** | `packages/product-contracts`, schemas, OpenAPI, generated-client drift check, strict registry, backward-compatibility baseline, importable package-artifact verification and `.github/workflows/product-contracts.yml`. Publish to the approved private registry is an explicit release action and has not been performed. |
| 3 | Platform issues verifiable audience-specific HRMS tokens | **Implemented and tested** | JWKS, RS256 signing, `aud=hrms-api`, issuer/expiry/tenant validation and `HrmsProductTokenGuard` tests. |
| 4 | HRMS obtains identity and entitlements through contracts | **Implemented and tested** | `HrmsPlatformContractAdapter`, `PRODUCT_PLATFORM_PORT`, generated `identityStatus`/entitlement clients, the service-authenticated identity-status endpoint and `/api/hrms/integration-context`; HRMS integration code does not read Platform identity/subscription tables. |
| 5 | One HRMS manifest covers Employees, Attendance, Leave and Payroll | **Implemented and tested** | `manifests/hrms.v1.json`, known-key registry and schema tests. Attendance and Payroll remain capabilities of HRMS, not separate product manifests. |
| 6 | Locale-aware HRMS routes work through the shell/gateway | **Implemented and tested** | `/{lang}/app/hrms/*` rewrites, canonical route helpers, access-state pages and Playwright route metadata tests for English, Arabic, deep links and query preservation. |
| 7 | Provisioning and suspension are idempotent and observable | **Implemented and tested** | Edge-triggered lifecycle events, transactional outbox, event ID as BullMQ `jobId`, retry/backoff, visible dead-letter state, request/trace headers and provisioning status resolver. |
| 8 | Isolation, authorization, contract, event and routing tests pass | **Phase 1 scope passed locally** | Focused suites cover unknown contract keys, passwordless Platform-session token exchange, wrong tokens, tenant mismatch, suspended tenant/user/membership/subscription state, disabled Payroll capability, quota locking, lifecycle convergence, outbox restart/retry/dead-letter and route metadata. A clean-checkout CI run remains an external release gate. |
| 9 | Existing production data remains unchanged and reconciled | **Production gate pending** | No production data was touched. Before release, capture approved pre/post counts and financial digests using the non-destructive procedure in `HRMS-DATA-EXTRACTION-READINESS.md`. |
| 10 | Extraction review approves a separate HRMS repository | **Pending external review** | The table-by-table ownership, dependency waves, reconciliation, cutover and routing rollback plan is complete. Do not create/cut over `deltcrm-hrms` until named reviewers approve it and a backup restore drill passes. |

## Locally Proven Behaviors

- Unknown products, capabilities, permissions and entitlement properties are rejected.
- Product tokens reject wrong issuer, audience, signature, expiry and tenant context.
- A Platform session is exchanged for an audience-specific HRMS token using only the requested audience; no second username or password is sent.
- Tenant and Platform browser sessions use server-set HTTP-only access and refresh cookies; the web stores no longer persist bearer or refresh tokens.
- Cookie-authenticated unsafe requests require the double-submit CSRF cookie/header pair, while explicit bearer mobile/service requests retain their existing transport.
- Product-token exchange remains passwordless and audience-specific after the cookie-session migration.
- Production startup validates that `AUTH_CSRF_COOKIE_DOMAIN` exactly matches `PUBLIC_BASE_DOMAIN` with a leading dot, preventing a silently broken tenant-subdomain session configuration.
- Production startup rejects missing or placeholder product-token keys, malformed or mismatched RSA key pairs, and missing, malformed or weak HRMS service credentials.
- Product-token issuance and every protected HRMS request recheck current tenant, user, membership, subscription and product state.
- Product-token permission mapping grants employee management only from explicit create, update or lifecycle permissions; read-only/report permissions remain read-only.
- Suspended tenants, disabled users, unavailable memberships, suspended subscriptions and inactive HRMS products are denied server-side.
- Entitlement decisions read the authoritative module assignment without a cache; disabling a module is reflected on the next read.
- A disabled Payroll module returns `PRODUCT_CAPABILITY_NOT_ENTITLED` from the API; hiding navigation is not treated as authorization.
- The generated client propagates `X-Request-Id`, `X-Trace-Id` and W3C `traceparent` across user and service calls.
- Concurrent employee creation is serialized per tenant using a transaction-scoped PostgreSQL advisory lock before quota reads.
- Lifecycle transitions emit only on inactive/active edges, preventing duplicate activation defaults from repeated equivalent assignments.
- Outbox delivery uses the persistent event ID as the queue idempotency key, retries failed events, survives a fresh relay process and dead-letters poison events.
- Suspension and reactivation resolve to deterministic provisioning states.
- Unsupported locale-prefixed HRMS deep links redirect to the saved tenant language while preserving the route and query string.

## Final Verification Commands

These commands are safe for local/CI verification and do not mutate production data:

```bash
pnpm --filter @deltcrm/product-contracts typecheck
pnpm --filter @deltcrm/product-contracts build
pnpm --filter @deltcrm/product-contracts test
pnpm --filter @deltcrm/product-contracts compatibility:check
pnpm --filter @deltcrm/product-contracts pack:check
pnpm --filter api architecture:test
pnpm --filter api typecheck
pnpm --filter api test -- --runInBand src/platform/product-integration src/products/hrms src/shared/http/auth-cookies.spec.ts src/shared/http/cors-origin.spec.ts src/shared/http/csrf.middleware.spec.ts src/shared/http/request-id.middleware.spec.ts src/shared/authorization/module.guard.spec.ts src/platform/identity/auth.controller.spec.ts src/platform/control-plane/platform-auth/platform-auth.controller.spec.ts src/platform/organization/employee-quota.service.spec.ts src/shared/events/outbox-relay.service.spec.ts src/shared/observability/observability.interceptor.spec.ts
pnpm --filter api test -- --runInBand src/shared/config/production-runtime-config.spec.ts
pnpm --filter api build
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter web exec playwright test e2e/hrms-product-routing-metadata.spec.ts e2e/tenant-portal-navigation-metadata.spec.ts
```

## Local Verification Result

- Product contract typecheck, build, schema tests, generated-client drift check, importable package-artifact verification and backward-compatibility check passed.
- API architecture checks passed with no new cross-module dependency.
- Scoped lint for the Phase 1 API files passed; final focused API verification passed with 18 suites and 113 tests.
- The final browser-session/runtime-configuration verification passed after adding production cookie-domain and product-trust validation.
- API typecheck and production build passed.
- Phase 1 web lint, web typecheck and production build passed; the build generated 155 routes.
- HRMS routing and tenant-navigation Playwright verification passed with 10 tests.
- Localization catalog validation passed with 1,308 matching English and Arabic entries.
- Repository-wide API lint remains blocked by pre-existing issues outside the Phase 1 files; no unrelated lint cleanup is included in this branch.
- Strict localization audit still reports 47 pre-existing hardcoded strings in payroll/platform UI files outside this contract boundary.
- No Prisma schema, migration, production database command or data mutation was introduced by Phase 1.

## External Release Gates

1. Record named architecture/security/data approvals in the ADRs and extraction review.
2. Publish `@deltcrm/product-contracts@1.0.0` to the approved private registry and pin it in consuming repositories.
3. Run CI from a clean checkout and retain artifacts.
4. Take and verify a production backup without altering source data.
5. Run the restore drill in an isolated environment and retain count/digest evidence.
6. Capture production pre/post reconciliation evidence for the release.
7. Approve the extraction review before creating or cutting over a separate HRMS repository.
8. Set the validated production `AUTH_CSRF_COOKIE_DOMAIN`, persistent RSA product-token key pair and product-scoped service credentials in the approved secret manager, then verify the same trust/session suites in clean-checkout CI.
