# DeltCRM Product Integration and Deployment Guide

## Purpose

This document explains how Platform-aware products are registered, integrated,
secured, localized, tested, and deployed. It is intended for developers adding
or operating HRMS, Mail, POS, or another DeltCRM product.

The central rule is:

> Platform owns the control plane. Each product owns its business data and
> business implementation. The contract package is the only integration
> boundary between them.

## 1. Product boundaries

### Platform owns

- tenants and workspaces
- Platform users, authentication, sessions, MFA, refresh, logout, and JWKS
- plans, subscriptions, billing, entitlements, and limits
- global roles and product permission assignments
- product registry, navigation, provisioning state, and lifecycle events
- supported locale, region, timezone, and currency policy
- Platform audit and operational health
- the unified shell and gateway routing

### A product owns

- its own API, web/mobile clients, database, migrations, cache, storage, jobs,
  reports, and audit evidence
- product entities and business rules
- product-specific permissions and capabilities
- product UI translations and product-specific workflows
- product health/readiness endpoints

HRMS therefore owns employees, attendance, leave, devices, documents, and
payroll. Mail would own mailboxes, templates, campaigns, and delivery. POS
would own catalog, inventory, orders, payments, and receipts.

No product may query another product database, import another product's
application modules, or share infrastructure credentials.

## 2. What the product contract is

The contract package is a versioned protocol, not a replacement for every
product's internal code. It defines the stable cross-product vocabulary:

- stable tenant, user, and membership identifiers
- product keys and API audiences
- product manifests, routes, health endpoints, capabilities, and permissions
- signed product-token claims
- entitlement and provisioning shapes
- navigation metadata
- lifecycle event envelopes and idempotency/correlation requirements
- standard errors and compatibility rules

The current contract registry includes `HRMS`, `MAIL`, and `POS`. HRMS has a
complete manifest. Mail and POS are registry placeholders and still need their
manifests, permissions, capabilities, routes, events, and product services.

## 3. How Platform becomes aware of a product

Products are not discovered by scanning arbitrary servers. A product is onboarded
explicitly:

1. The product team defines a manifest and adds it to the versioned contract.
2. Platform registers the product key, audience, route metadata, health checks,
   capabilities, permissions, and lifecycle handlers.
3. The product is attached to plans or explicitly enabled for selected tenants.
4. Platform creates/updates the tenant entitlement and provisioning state.
5. Platform publishes an activation event or calls the supported provisioning
   endpoint.
6. The product projects only the stable Platform identity and entitlement data
   it needs.
7. Platform navigation exposes the product only when entitlement and permission
   checks succeed.

The product registry is the control-plane source of truth. A production-ready
implementation should validate manifests at CI time and reject duplicate keys,
unsupported contract versions, missing health endpoints, and undeclared
permissions.

## 4. Authentication and product access flow

### Workspace signup/login

Workspace signup and tenant login are Platform-owned APIs:

```text
POST /auth/signup
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

These endpoints use Platform DTOs and Platform session cookies/tokens. The
contract is not used as the password/signup implementation.

### Platform administration login

Platform operators use the separate Platform-admin session and MFA flow:

```text
POST /platform/auth/login
POST /platform/auth/mfa/verify
POST /platform/auth/refresh
GET  /platform/auth/me
```

### Opening a product

After a user has a valid Platform session:

1. The shell reads the tenant identity and effective entitlements from Platform.
2. The shell hides or shows product navigation based on those entitlements.
3. The browser opens the product's gateway route, for example
   `/{locale}/app/hrms`.
4. Platform issues a short-lived signed product token for the requested product:

   ```text
   POST /product-integration/token
   body: { "audience": "hrms-api" }
   ```

5. The token contains the contract-defined tenant, user, roles, permissions,
   capabilities, locale, issuer, audience, issue time, expiry, and entitlement
   version.
6. The product validates the signature from Platform JWKS and independently
   enforces permissions on every API request.

The token must never be put in a URL, browser history, or logs.

## 5. Entitlements, roles, and permissions

These are different concepts:

- **Subscription/plan:** what a tenant has purchased.
- **Entitlement:** whether a product or capability is active for that tenant.
- **Role:** a reusable assignment of permission keys to a user.
- **Permission:** the API-enforced action, such as
  `hrms.payroll.manage`.
- **Capability:** a broader product feature, such as `HRMS_PAYROLL`.

Platform decides whether a tenant may use HRMS, Mail, or POS. The product API
still checks the permission claims itself; hiding a UI button is not security.

Removing an entitlement must stop new product-token issuance and cause the
product to reject stale or revoked access within the agreed propagation target.

## 6. Localization model

Platform owns the policy:

- supported locales (`en`, `ar`, and future approved locales)
- region, timezone, and currency defaults
- tenant-level locale selection
- global shell/navigation strings

Each product owns its own translation catalog and product-specific strings.
Products must support English LTR and Arabic RTL where the product is released.
The contract carries locale and policy claims; it does not carry every
translation string.

## 7. Web and gateway routing

Customers use the gateway only. Internal ports are for diagnostics and tests.

```text
Gateway       http://localhost:4080
Platform API  http://localhost:4011
Platform web  http://localhost:4022
HRMS API      http://localhost:4012 (target local compose port)
HRMS web      http://localhost:4023 (target local compose port)
```

The gateway preserves tenant host, locale, request ID, correlation ID,
forwarded protocol, and client IP. Browser page requests and product API
requests must not be confused when they share a URL prefix. Add an explicit
gateway route and an automated smoke test whenever a new product is onboarded.

## 8. Mobile applications

The current Flutter mobile application is located under `CRM/apps/mobile`,
which is Platform's repository. Its screens and tenant controller are HRMS
business functionality, so this is a transitional ownership violation.

### Target ownership

The HRMS mobile application should be owned and released by the HRMS product
repository (for example, `deltcrm-hrms/apps/mobile` or a separately owned
HRMS-mobile repository). Platform may provide shared SDKs or generated contract
types, but must not own HRMS business screens or HRMS persistence code.

### Mobile authentication flow

The mobile app should use Platform as the identity authority:

1. Mobile calls Platform login using the supported mobile auth endpoint.
2. Platform returns the tenant-aware session and refresh credentials using the
   approved mobile storage/rotation rules.
3. Mobile requests a product token for the selected product/audience.
4. Mobile calls HRMS only through the HRMS API/gateway using that product token.
5. HRMS validates the same issuer, JWKS, audience, expiry, tenant, entitlement,
   and permission claims as the web client.
6. Refresh, logout, revoked users, suspended tenants, and removed entitlements
   fail closed consistently with web.

Mobile must not connect directly to Platform or HRMS databases, embed a shared
database client, or hardcode product permissions outside the contract/generated
client. Device trust, biometrics, geofence evidence, and attendance records are
HRMS-owned; Platform only provides identity and entitlement context.

### Mobile migration steps

- decide whether the app is HRMS-only or a multi-product shell
- move HRMS screens and HRMS API clients to HRMS ownership
- keep only shared authentication/contract SDK code reusable
- generate mobile routes/types from the official contract/OpenAPI
- add mobile SSO, entitlement removal, tenant isolation, offline/retry, and
  logout tests
- create an independent HRMS mobile build, signing, release, and rollback path

## 9. Adding Mail or POS

For a new product, the minimum onboarding package is:

- a versioned manifest
- product API audience and token verifier
- route/deep-link metadata
- capability and permission catalog
- lifecycle event consumer/producer definitions
- health/readiness endpoints
- independent database, cache, storage, migrations, jobs, and backups
- Platform registry/plan/entitlement configuration
- web/mobile client using shared auth and generated contract clients
- contract compatibility, tenant isolation, SSO, failure, and localization tests

The product is not ready merely because its frontend link appears in the shell.
Its API must enforce the same claims and its independent deployment must be
tested.

## 10. Local verification flow

Start Platform, HRMS, and gateway with independent volumes. Then verify:

```bash
curl http://localhost:4080/gateway-health
curl http://localhost:4080/healthz
curl http://localhost:4080/api/hrms/healthz
```

Run the contract smoke test with local credentials:

```bash
PLATFORM_TEST_EMAIL=admin@acme.com \
PLATFORM_TEST_PASSWORD=TenantAdmin123! \
PLATFORM_TEST_WORKSPACE=acme \
PLATFORM_BASE_URL=http://127.0.0.1:4011 \
HRMS_BASE_URL=http://127.0.0.1:4012 \
node CRM/scripts/verify-local-product-http.mjs
```

The acceptance suite must also cover browser login, product deep links,
refresh, English/Arabic, entitlement removal, tenant isolation, API permission
denials, invalid/expired tokens, dependency outages, and restart independence.

## 11. Deployment readiness assessment

The repositories are not production-ready according to the corrective plan.
They are suitable for continued local integration work and selected staging
preparation.

### Evidence already demonstrated locally

- Platform schema purity and HRMS runtime-boundary checks pass.
- Contract validation, generated client, and backward-compatibility checks pass.
- Platform and HRMS API typechecks and unit suites pass in the current workspace.
- Independent local database boundary checks pass.
- Platform API/web images can build with bounded Docker contexts.
- Gateway/platform browser routing smoke checks are available.

### Blocking production gates

- Official immutable contract package adoption is incomplete on Platform; it
  still imports a workspace-local contract package.
- HRMS private GitHub Packages access must be configured in local builds, CI,
  and deployment secrets.
- Full HRMS web/mobile SSO and deep-link acceptance is not complete.
- Complete HRMS attendance/payroll UI flow and failure matrix are not complete.
- Migration snapshot, importer, ledger, replay, reconciliation, and rollback
  tooling are not complete or production-rehearsed.
- Staging deployment, anonymized data rehearsal, load/security testing,
  backup/restore drill, and named approvals are not complete.
- Independent production deployment, observability, backup, restore, and
  rollback runbooks are not proven.
- HRMS mobile ownership and independent release pipeline remain unresolved.
- Mail and POS are not fully onboarded products.

Therefore the correct status is:

```text
Local boundary:              partially proven
Local Platform UI:           runnable and smoke-tested
Local complete HRMS journey: not complete
Staging readiness:           not ready
Production deployment:       not approved / not ready
```

## 12. Definition of done for a new product

A product can be declared integrated only when all of the following are true:

- its manifest is versioned and validated
- Platform registry, plans, entitlements, navigation, and lifecycle state work
- Platform issues a contract-compliant token for the product
- the product verifies the token and enforces permissions server-side
- web and mobile clients use the supported Platform session flow
- English/Arabic and deep links work through the gateway
- tenant isolation and failure tests pass
- the product builds and deploys without Platform application code or data
- independent health, logs, metrics, backups, restores, and rollback exist
- compatibility and release evidence are archived

The separation is production-complete only after the G1–G10 gates in the
corrective implementation plan are all approved.
