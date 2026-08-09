# Phase 1: Product Integration Contract Implementation Plan

## 1. Purpose

**Status:** Local engineering implementation complete; external release and production-safety approvals pending
**Depends on:** `MULTI-PRODUCT-PLATFORM-INTEGRATION-IMPLEMENTATION-PLAN.md`
**Primary owners:** Platform team with HRMS, Mail, POS, Security and DevOps reviewers
**Exit outcome:** Platform and HRMS communicate through approved, versioned contracts inside the existing system, and HRMS is safe to extract without copying Platform internals or sharing databases.

This phase defines the rules every DeltCRM product must follow. It must be completed before moving HRMS into a separate repository. No production data is moved or deleted in this phase.

## 2. Core Rule

```text
Platform decides WHO the user is and WHAT products/capabilities they may access.
Product decides WHAT the user may do with that product's business data.
```

The Platform is the control plane. HRMS, Mail and POS are product data planes. A product may depend on published Platform contracts, but it must not import Platform implementation code or connect to the Platform database.

## 3. Ownership Boundaries

### 3.1 Platform-owned responsibilities

| Area                | Platform responsibility                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Tenant lifecycle    | Create, identify, suspend and reactivate tenants; own immutable`tenantId`, workspace slug and custom-domain mapping |
| Identity            | Login, password, session, MFA, user status and immutable`userId`                                                    |
| Membership          | Associate users with tenants and track active/suspended membership                                                    |
| Global access       | Business Admin and platform-level assignments; issue effective product permission claims                              |
| Product registry    | Register HRMS, Mail and POS manifests, versions, routes, permissions and health metadata                              |
| Subscriptions       | Plans, billing state, product purchases, capability entitlements, limits and temporary overrides                      |
| Provisioning        | Coordinate product activation, suspension, retries and provisioning status                                            |
| Navigation          | Return entitled products and product entry routes for the shared application shell                                    |
| Localization policy | Enabled locales, tenant default locale, regional pack and locale-aware route rules                                    |
| Shared shell        | Tenant branding, sidebar, header, language switcher, notifications entry and account menu                             |
| Platform audit      | Authentication, entitlement, subscription, impersonation and cross-product administrative events                      |
| Service trust       | Product credentials, signing keys, public JWKS, credential rotation and service authorization                         |

The Platform must not own attendance records, payslips, POS sales, inventory, mail messages or other product business records.

### 3.2 Product-owned responsibilities

Every product owns:

- Its frontend, backend, database/schema, migrations and backups.
- Its business entities and business rules.
- Product-specific permission definitions and authorization enforcement.
- Product-specific role templates or policy assignments that reference Platform `userId` values.
- Product configuration, audit detail and operational history.
- Product jobs, files, exports, imports and background processing.
- Product health, readiness, metrics, traces and runbook.
- Tenant isolation inside every query and job.

Product examples:

| Product | Authoritative data                                                                                |
| ------- | ------------------------------------------------------------------------------------------------- |
| HRMS    | Employees, organization, offices, attendance, shifts, leave, payroll, HR documents and HR reports |
| Mail    | Mailboxes, messages, folders, templates, campaigns and delivery state                             |
| POS     | Locations, catalog, inventory, registers, sales, payments and receipts                            |

### 3.3 Shared concerns and decision owner

| Concern               | Decision owner                             | Product obligation                                                               |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| User authentication   | Platform                                   | Accept only Platform-issued identity/session credentials                         |
| Product permissions   | Product defines; Platform registers/grants | Enforce permission on every protected operation                                  |
| Tenant entitlement    | Platform                                   | Reject disabled, suspended or unlicensed access                                  |
| Tenant business setup | Product                                    | Create defaults idempotently after provisioning                                  |
| Language route        | Platform shell                             | Serve content under`/{locale}/app/{product}` and preserve locale on navigation |
| Translation catalog   | Platform governance                        | Supply product translation keys and consume approved locale packs                |
| Files                 | Product                                    | Own metadata and object namespace; never share unrestricted bucket credentials   |
| Notifications         | Platform delivery service                  | Product requests delivery through contract or publishes a notification event     |
| Audit                 | Both                                       | Product stores detail and forwards required cross-product summaries              |
| Analytics             | Platform aggregation                       | Product publishes approved, non-sensitive metrics/events                         |

## 4. Required Contract Package

Create a dedicated private package/repository named `deltcrm-contracts`. It contains schemas and generated clients only; it must not contain database clients, NestJS services, React components or product business logic.

```text
deltcrm-contracts/
├── manifests/
├── identity/
├── entitlements/
├── navigation/
├── provisioning/
├── events/
├── errors/
├── openapi/
├── generated/
├── compatibility-tests/
└── CHANGELOG.md
```

Publish immutable semantic versions to the private package registry. Products pin an approved version and upgrades are explicit.

## 5. Contract Definitions

### 5.1 Shared identifiers

The following identifiers are globally stable strings and never encode a subdomain, email or database sequence:

```text
tenantId
userId
membershipId
productKey
subscriptionId
requestId
eventId
correlationId
```

The Platform creates tenant, user and membership identifiers. Products create identifiers for their own records. A workspace slug may change; `tenantId` cannot.

### 5.2 Product manifest

Every product publishes a validated manifest:

```json
{
  "contractVersion": "1.0",
  "key": "HRMS",
  "name": "DeltCRM HRMS",
  "version": "1.0.0",
  "frontendPathTemplate": "/{locale}/app/hrms",
  "apiPath": "/api/hrms",
  "healthEndpoint": "/healthz",
  "readinessEndpoint": "/readyz",
  "permissions": [
    "hrms.employees.read",
    "hrms.attendance.manage",
    "hrms.payroll.manage"
  ],
  "capabilities": [
    "HRMS_EMPLOYEES",
    "HRMS_ATTENDANCE",
    "HRMS_LEAVE",
    "HRMS_PAYROLL"
  ],
  "eventsConsumed": ["platform.tenant.provisioned.v1"],
  "eventsPublished": ["hrms.employee.created.v1"]
}
```

Rules:

- `productKey`, permission keys and capability keys become immutable after production use.
- HRMS publishes one manifest. Attendance, Leave and Payroll do not publish separate product manifests.
- Routes must remain below the declared product prefix.
- Manifest changes must pass schema and backward-compatibility checks in CI.

### 5.3 Identity and product token

The tenant and Platform browser sessions use server-set secure HTTP-only access
and refresh cookies. Cookie-authenticated state-changing requests require a
matching CSRF cookie/header pair. Mobile and service clients continue to use
explicit bearer credentials and are not converted to browser cookies.

Regardless of browser-session transport, a product never receives a password.
It exchanges the authenticated Platform session for a short-lived, signed token
with an explicit product audience.

Required claims:

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "membershipId": "membership-uuid",
  "roles": ["BUSINESS_ADMIN"],
  "products": ["HRMS", "MAIL"],
  "capabilities": ["HRMS_ATTENDANCE", "HRMS_PAYROLL"],
  "permissions": ["hrms.attendance.manage"],
  "iss": "https://auth.blufield.cloud",
  "aud": "hrms-api",
  "iat": 1780000000,
  "exp": 1780000900,
  "jti": "token-uuid"
}
```

Every product validates signature, issuer, audience, expiry, tenant, user status, entitlement and permission. Public headers such as `X-Tenant-Id` are never trusted without an authenticated credential.

### 5.4 Entitlement contract

The Platform exposes one normalized response:

```json
{
  "tenantId": "tenant-uuid",
  "subscriptionStatus": "ACTIVE",
  "products": [
    {
      "key": "HRMS",
      "active": true,
      "capabilities": {
        "HRMS_ATTENDANCE": true,
        "HRMS_LEAVE": true,
        "HRMS_PAYROLL": false
      },
      "limits": {
        "employees": 100
      }
    }
  ],
  "version": 42,
  "effectiveAt": "2026-08-05T00:00:00Z"
}
```

Products may cache this response briefly, but suspension and entitlement-removal events must invalidate the cache. Navigation visibility is not authorization.

### 5.5 Navigation contract

The Platform shell returns only entries allowed by entitlement and user permission:

```json
{
  "items": [
    { "key": "home", "hrefTemplate": "/{locale}/app" },
    { "key": "hrms", "hrefTemplate": "/{locale}/app/hrms" },
    { "key": "mail", "hrefTemplate": "/{locale}/app/mail" }
  ]
}
```

The client resolves `{locale}` from the current URL. Switching `en` and `ar` preserves the tenant host, product path, query string and valid deep-link state.

### 5.6 Internal API contract

Synchronous Platform operations use `/internal/v1` endpoints and short-lived service credentials:

```text
GET  /internal/v1/tenants/:tenantId
GET  /internal/v1/users/:userId
GET  /internal/v1/tenants/:tenantId/entitlements
POST /internal/v1/audit-events
POST /internal/v1/notification-requests
```

All APIs use:

- OpenAPI schemas and generated clients.
- UTC ISO-8601 timestamps.
- Stable machine-readable error codes.
- Cursor pagination for unbounded lists.
- `Idempotency-Key` for retryable writes.
- `X-Request-Id` and trace context.
- Explicit timeouts; no unbounded service calls.

Standard error envelope:

```json
{
  "statusCode": 403,
  "code": "PRODUCT_NOT_ENTITLED",
  "message": "HRMS Payroll is not enabled for this workspace",
  "requestId": "request-uuid",
  "timestamp": "2026-08-05T00:00:00Z"
}
```

### 5.7 Event contract

Every durable event uses the same envelope:

```json
{
  "eventId": "event-uuid",
  "eventType": "platform.tenant.provisioned.v1",
  "occurredAt": "2026-08-05T00:00:00Z",
  "producer": "PLATFORM",
  "tenantId": "tenant-uuid",
  "actorId": "user-uuid",
  "correlationId": "correlation-uuid",
  "schemaVersion": 1,
  "payload": {}
}
```

Rules:

- Producers write domain changes and outbox records in one transaction.
- Consumers store processed `eventId` values and are idempotent.
- Retries use bounded exponential backoff.
- Exhausted failures enter a visible dead-letter queue.
- Published schemas are immutable; breaking changes create `v2`.
- Events contain identifiers and necessary facts, not passwords, tokens or unnecessary personal data.

### 5.8 Provisioning contract

Platform owns this state machine:

```text
NOT_REQUESTED -> PENDING -> PROVISIONING -> ACTIVE
                               |             |
                               v             v
                             FAILED       SUSPENDED
```

Required commands/events:

```text
platform.tenant.provisioned.v1
platform.product.activation-requested.v1
product.tenant.activated.v1
product.tenant.activation-failed.v1
platform.product.suspension-requested.v1
product.tenant.suspended.v1
```

Activation and suspension handlers must be safe to run repeatedly. Product failure must not roll back Platform identity or create duplicate product tenants.

## 6. Security and Data Rules

1. Products never share production database credentials.
2. Products never query another product's tables.
3. Every product table containing tenant data includes `tenantId` and enforced tenant isolation.
4. Service credentials and signing keys remain outside Git and support rotation.
5. Browser cookies use `Secure`, `HttpOnly` and an approved `SameSite` policy.
6. Product tokens are short-lived and audience-specific.
7. Sensitive data is encrypted according to product classification requirements.
8. Logs and events must not contain passwords, tokens, bank details or unmasked government identifiers.
9. Production migrations are forward-only, preceded by verified backups and never run seeds or destructive resets.
10. Cross-product calls are denied by default and explicitly allowlisted.

## 7. Implementation Sequence

### Work Package 1: Ownership and architecture decisions

- [ ] Approve the ownership tables in this document with named Platform, HRMS, Security, DevOps and Data owners.
- [x] Record architecture decisions for repository, database, gateway, SSO and event-bus boundaries.
- [x] Assign Platform and HRMS code/data ownership paths in `CODEOWNERS`.
- [x] Inventory current cross-boundary imports, tables and transactions.
- [x] Freeze new direct Platform-to-HRMS database coupling through architecture checks.

### Work Package 2: Contract repository

- [x] Create the extraction-ready `@deltcrm/product-contracts` package and `CODEOWNERS` in the monorepo.
- [x] Add manifest, token, entitlement, navigation, error and event schemas.
- [x] Add semantic versioning and changelog rules.
- [x] Generate TypeScript clients/types.
- [x] Add schema, lint and backward-compatibility checks to CI.
- [ ] Move the package to the approved private contract repository when the repository boundary is approved.
- [ ] Publish version `1.0.0` to the private package registry.

### Work Package 3: Platform contract endpoints

- [x] Expose JWKS and audience-specific token issuance/exchange.
- [x] Implement effective entitlement endpoint.
- [x] Implement entitled navigation endpoint.
- [x] Implement service credential validation.
- [x] Implement product registration and provisioning status.
- [x] Add audit records for token, entitlement and provisioning changes.

### Work Package 3A: Browser session hardening

- [x] Replace client-persisted tenant and Platform access/refresh tokens with
  server-set `Secure`, `HttpOnly` cookies using the approved `SameSite` policy.
- [x] Add CSRF protection for cookie-authenticated state-changing requests.
- [x] Keep product-token exchange passwordless and audience-specific after the
  browser-session migration.
- [x] Add login, refresh, logout, session expiry, CSRF and cross-subdomain tests.

### Work Package 4: HRMS adapter inside the current repository

- [x] Register a single `HRMS` manifest.
- [x] Map existing Attendance, Leave and Payroll flags to HRMS capabilities.
- [x] Make the HRMS integration boundary consume the approved identity and entitlement interfaces.
- [x] Add a temporary adapter around unavoidable shared-database access and document its removal owner.
- [x] Publish HRMS lifecycle events through the existing outbox.
- [x] Preserve all current tenant, employee, attendance and payroll data; Phase 1 contains no Prisma migration or data movement.

### Work Package 5: Gateway and local composition

- [x] Route `/{locale}/app/hrms/*` and `/api/hrms/*` without changing the customer host.
- [x] Preserve `/en` and `/ar` across navigation, refresh and deep links.
- [x] Add local gateway composition for Platform plus HRMS.
- [x] Add controlled unauthorized, subscription-required and product-unavailable pages.
- [x] Add request and trace IDs across gateway, Platform and HRMS.

### Work Package 6: Extraction readiness review

- [x] Confirm the HRMS integration boundary can authenticate without reading Platform identity tables.
- [x] Confirm the HRMS integration boundary can authorize entitlements without reading Platform subscription tables.
- [x] Confirm architecture checks prevent new Platform reads of HRMS business tables.
- [x] Produce a table-by-table HRMS data migration and rollback plan.
- [ ] Approve backup, reconciliation, shadow-read and cutover procedures.
- [ ] Create the `deltcrm-hrms` repository only after this review passes.

## 8. Test Plan

### Contract tests

- [x] Every manifest validates against the published schema.
- [x] Breaking schema changes fail CI unless released as a new major/event version.
- [x] Generated clients match the committed OpenAPI contract.
- [x] Unknown product, capability and permission keys are rejected.

### Authentication and authorization tests

- [x] One Platform login exchanges the existing Platform session for an entitled HRMS product token without another password.
- [x] Wrong issuer, audience, signature, expiry and tenant are rejected.
- [x] Tenant A credentials cannot access tenant B records.
- [x] Suspended users, memberships, tenants and subscriptions are rejected.
- [x] Hidden navigation cannot bypass backend authorization.

### Entitlement tests

- [x] HRMS can be active while Payroll capability is disabled.
- [x] Direct Payroll URLs return `PRODUCT_CAPABILITY_NOT_ENTITLED` when disabled.
- [x] Entitlement changes are reflected without stale authorization decisions. The Phase 1 adapter reads the authoritative assignment on each decision and does not cache it.
- [x] Employee limits are enforced server-side under concurrent requests.

### Provisioning and event tests

- [x] Duplicate activation events create only one product tenant projection.
- [x] Failed activation retries without duplicating defaults.
- [x] Outbox events survive process restart.
- [x] Poison events enter a visible dead-letter queue.
- [x] Suspension and reactivation converge to the correct state.

### Routing and localization tests

- [x] `/en/app/hrms/...` and `/ar/app/hrms/...` route to the same product deployment.
- [x] Language switching preserves the active HRMS page and query string.
- [x] Unsupported locales redirect to the tenant default.
- [x] API routes remain locale-independent.
- [x] Browser refresh and deep-link routing metadata work through the gateway.

### Data-safety tests

- [ ] Baseline and post-change tenant, user, employee, attendance and payroll counts match.
- [x] No production seed, reset, truncate or destructive migration is used by Phase 1.
- [ ] Backup restore is tested before any future data cutover.
- [ ] Products cannot connect using another product's database credentials.

## 9. Phase 1 Acceptance Criteria

Phase 1 is complete only when:

1. Platform and product ownership is approved and documented.
2. `deltcrm-contracts@1.0.0` is published with compatibility checks.
3. Platform issues verifiable, audience-specific HRMS tokens.
4. HRMS obtains identity and entitlement through contracts rather than Platform internals.
5. One HRMS manifest represents Employees, Attendance, Leave and Payroll capabilities.
6. Locale-aware HRMS routes work through the shared gateway and shell.
7. Provisioning and suspension are idempotent and observable.
8. Tenant-isolation, authorization, contract, event and routing tests pass.
9. Existing production data remains unchanged and reconciled.
10. The extraction-readiness review approves creation of the separate HRMS repository.

## 10. Explicitly Deferred

- Moving production HRMS tables to a new database.
- Deleting HRMS code from the current repository.
- Creating Mail or POS business functionality.
- Runtime module federation or iframe composition.
- Sharing databases as a shortcut during final extraction.
- Switching production traffic before shadow validation and rollback testing.

## 11. Immediate Next Execution Order

1. Obtain named Platform, HRMS, Security, DevOps and Data-owner approval for the
   ownership boundaries and ADRs.
2. Move `@deltcrm/product-contracts` to the approved private contract repository,
   publish immutable version `1.0.0`, and pin that version in Platform and HRMS.
3. Configure persistent matching RSA signing keys, product-scoped service
   credentials and the approved cross-subdomain CSRF cookie domain in the
   production secret manager.
4. Run the clean-checkout CI gate and retain contract, API, web and routing
   artifacts.
5. Verify a production backup and complete an isolated restore drill; do not run
   a seed, reset, `db push`, truncate or destructive migration.
6. Approve reconciliation, shadow-read, cutover and rollback procedures.
7. Only then create the separate `deltcrm-hrms` repository and move HRMS in the
   documented extraction waves. Mail and POS must integrate through the same
   published contract rather than importing Platform code.
