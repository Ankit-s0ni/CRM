# Multi-Product Platform Integration Implementation Plan

## 1. Purpose

**Status:** Proposed
**Primary owners:** Platform, HRMS, POS and Mail teams
**Architecture:** Separate full-stack product repositories connected through one DeltCRM platform
**Customer outcome:** A tenant receives one subdomain, one login, one navigation system and one billing relationship while independently deployed HRMS, POS and Mail products appear as one application.

DeltCRM will operate as a multi-product SaaS platform. The Platform is the control plane; HRMS, POS and Mail are independently owned product services. Separate repositories must not create separate customer experiences or allow products to share databases and internal code.

## 2. Confirmed Decisions

1. Platform, HRMS, POS and Mail are separate full-stack repositories with independent teams, pipelines and deployments.
2. A customer continues to use one tenant URL such as `acme.blufield.cloud`.
3. Authentication, tenant identity, subscriptions, product entitlements, global roles, localization and platform audit remain centralized.
4. Products connect through signed identity tokens, versioned APIs and versioned events, never through another service's database.
5. Public product routes are composed at the gateway by URL path. Iframes and runtime module federation are not part of the initial implementation.
6. Every product frontend uses the shared DeltCRM application shell, design system, authentication client and localization contracts.
7. WebSockets are used only where a feature needs real-time updates; they are not the general product integration mechanism.

## 3. Repository Ownership

| Repository                 | Owning team                     | Responsibilities                                                                                                                              |
| -------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `deltcrm-platform`       | Platform                        | Tenant lifecycle, identity, SSO, RBAC, subscriptions, entitlements, product registry, navigation, localization, audit and gateway integration |
| `deltcrm-hrms`           | HRMS                            | Employees, organization, attendance, leave, payroll, HRMS frontend and employee mobile application                                            |
| `deltcrm-pos`            | POS                             | Catalog, inventory, locations, registers, sales, payments and POS frontend                                                                    |
| `deltcrm-mail`           | Mail                            | Mailboxes, messages, templates, campaigns and Mail frontend                                                                                   |
| `deltcrm-contracts`      | Platform with product reviewers | OpenAPI definitions, event schemas, shared identifiers and generated clients                                                                  |
| `deltcrm-design-system`  | UI/platform                     | Application shell, components, typography, tokens, icons, responsive behavior and accessibility                                               |
| `deltcrm-infrastructure` | Platform/DevOps                 | Gateway, DNS, TLS, service deployment, observability, secrets, backups and environment templates                                              |
| `deltcrm-landing`        | Marketing/web                   | Public marketing website and product pages                                                                                                    |

The existing CRM repository should not be split by copying files without ownership analysis. The extraction sequence in Section 13 preserves behavior and data while establishing these boundaries.

## 4. Unified Tenant Experience

For a tenant named Acme, the public experience remains:

```text
https://acme.blufield.cloud/login
https://acme.blufield.cloud/app
```

Product routes remain on the same host:

```text
acme.blufield.cloud/app                 -> Platform dashboard
acme.blufield.cloud/app/hrms/*          -> HRMS frontend
acme.blufield.cloud/app/mail/*          -> Mail frontend
acme.blufield.cloud/app/pos/*           -> POS frontend

acme.blufield.cloud/api/platform/*      -> Platform API
acme.blufield.cloud/api/hrms/*          -> HRMS API
acme.blufield.cloud/api/mail/*          -> Mail API
acme.blufield.cloud/api/pos/*           -> POS API
```

The gateway resolves `acme` to an immutable tenant UUID. Product records use that UUID; they do not use the subdomain as their permanent foreign identifier. A later subdomain change therefore does not disconnect product data.

## 5. Gateway Composition

Nginx or a managed API gateway is the only public entry point:

```text
                         acme.blufield.cloud
                                  |
                           Gateway / WAF
                                  |
           +----------------------+----------------------+
           |                      |                      |
       Platform                HRMS                 Mail / POS
     web and API           web and API              web and API
```

Illustrative route configuration:

```nginx
location /app/hrms/ { proxy_pass http://hrms-web; }
location /api/hrms/ { proxy_pass http://hrms-api; }

location /app/mail/ { proxy_pass http://mail-web; }
location /api/mail/ { proxy_pass http://mail-api; }

location /app/pos/ { proxy_pass http://pos-web; }
location /api/pos/ { proxy_pass http://pos-api; }

location /app/ { proxy_pass http://platform-web; }
location /api/platform/ { proxy_pass http://platform-api; }
```

Production routing must include TLS termination, request IDs, rate limits, body-size limits, timeouts, WebSocket upgrade rules only for declared real-time endpoints, and health-aware upstreams.

## 6. Product Integration Contract

Every product is connected through five required integration points.

### 6.1 Product manifest

Each product provides a versioned manifest:

```json
{
  "key": "MAIL",
  "name": "DeltCRM Mail",
  "version": "1.0.0",
  "frontendPath": "/app/mail",
  "apiPath": "/api/mail",
  "healthEndpoint": "/health",
  "icon": "mail",
  "permissions": [
    "mail.messages.read",
    "mail.messages.send",
    "mail.settings.manage"
  ],
  "eventsConsumed": [
    "platform.tenant.provisioned.v1",
    "platform.subscription.changed.v1"
  ],
  "eventsPublished": [
    "mail.mailbox.created.v1",
    "mail.message.sent.v1"
  ]
}
```

The Platform validates manifests and uses them for navigation, permission registration, subscriptions, routing metadata and health monitoring. Product keys and published permission keys are immutable once used in production.

### 6.2 Central authentication and SSO

The Platform is the identity provider. Users log in once and products do not maintain independent passwords.

```text
User -> Platform login -> secure session/token -> entitled product
```

The signed product token contains at least:

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "roles": ["BUSINESS_ADMIN"],
  "products": ["HRMS", "MAIL"],
  "permissions": ["hrms.employees.read", "mail.messages.read"],
  "iss": "https://auth.blufield.cloud",
  "aud": ["hrms-api", "mail-api"],
  "exp": 1780000000
}
```

Each backend validates signature, issuer, audience, expiry, tenant, user status, entitlement and permission. Browser authentication uses secure HTTP-only cookies. Internal service calls use short-lived service credentials; public callers cannot supply a trusted tenant identity through headers alone.

### 6.3 Versioned Platform API

Synchronous operations use a versioned internal API:

```text
GET  /internal/v1/tenants/:tenantId
GET  /internal/v1/users/:userId
GET  /internal/v1/tenants/:tenantId/entitlements
POST /internal/v1/audit-events
POST /internal/v1/notifications
```

Internal requests include a service token and correlation data:

```http
Authorization: Bearer <short-lived-service-token>
X-Tenant-Id: <tenant-uuid>
X-Request-Id: <request-uuid>
```

The signed credential authorizes the call. `X-Tenant-Id` only scopes the request and must not be trusted by itself.

### 6.4 Versioned event bus

Asynchronous lifecycle and cross-product updates use durable events:

```text
Platform publishes
- platform.tenant.provisioned.v1
- platform.tenant.suspended.v1
- platform.user.created.v1
- platform.user.disabled.v1
- platform.subscription.changed.v1
- platform.localization.updated.v1

HRMS publishes
- hrms.employee.created.v1
- hrms.employee.updated.v1
- hrms.employee.terminated.v1
- hrms.payroll.finalized.v1

Mail publishes
- mail.mailbox.created.v1
- mail.message.sent.v1
- mail.delivery.failed.v1

POS publishes
- pos.location.created.v1
- pos.sale.completed.v1
- pos.stock.low.v1
```

Every producer uses an outbox pattern. Every consumer is idempotent, stores processed event IDs, supports retries and routes exhausted failures to a dead-letter queue. Event schemas are versioned in `deltcrm-contracts`; breaking changes create a new version rather than modifying a published schema.

### 6.5 Shared frontend contracts

Every product frontend consumes versioned packages:

```text
@deltcrm/app-shell
@deltcrm/design-system
@deltcrm/auth-client
@deltcrm/platform-sdk
@deltcrm/localization
@deltcrm/contracts
```

`@deltcrm/app-shell` owns the responsive sidebar, header, tenant branding, language control, notifications, user menu and product navigation. A product supplies its active product and page content:

```tsx
<AppShell activeProduct="MAIL">
  <MailInbox />
</AppShell>
```

The initial release uses route-level composition. It must not use iframes. Runtime module federation may be evaluated later only when there is a demonstrated requirement for cross-product client-side composition.

## 7. Navigation and Entitlements

The Platform is the source of truth for purchased products. It returns navigation based on the authenticated user's tenant entitlements and permissions:

```json
{
  "items": [
    { "label": "Dashboard", "href": "/app" },
    { "label": "HRMS", "href": "/app/hrms" },
    { "label": "Mail", "href": "/app/mail" }
  ]
}
```

Hiding navigation is not authorization. The gateway and target service both reject access when the product is disabled, the subscription is suspended or the user lacks permission.

## 8. Signup and Product Provisioning

When an organization signs up:

1. Platform creates the tenant and immutable tenant UUID.
2. Platform reserves the requested tenant subdomain.
3. Platform creates the Business Admin identity and role assignment.
4. Platform stores the selected plan and product entitlements.
5. Platform commits an outbox event for `platform.tenant.provisioned.v1`.
6. Entitled products consume the event and create local tenant projections/defaults.
7. Products publish activation success or failure events.
8. Platform displays provisioning status and generates entitled navigation.
9. The user enters the same tenant portal; no second product login is required.

Provisioning must be retryable and observable. A product outage must not cause duplicate tenants or partially committed Platform identity records.

## 9. Example Cross-Product Flow

When HR creates an employee:

1. HRMS validates the tenant entitlement and HR permission.
2. HRMS commits the employee and `hrms.employee.created.v1` to its outbox.
3. Platform may create employee application access according to tenant policy.
4. Mail may create a mailbox only when Mail is entitled and automatic mailbox creation is enabled.
5. Consumer failures retry independently and do not roll back the HRMS employee transaction.
6. Every resulting action records tenant, actor, request and source event IDs.

## 10. Data Ownership

| Owner    | Authoritative data                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------- |
| Platform | Tenants, identities, global access, subscriptions, entitlements, localization and product registry |
| HRMS     | Employees, organization, attendance, leave and payroll                                             |
| POS      | Catalog, inventory, registers, sales and payments                                                  |
| Mail     | Mailboxes, messages, templates and campaigns                                                       |

Each product owns its database or isolated PostgreSQL schema, migration history, backups and restore tests. Products may keep event-fed read projections of another service's data, but they must not directly read or write another product's tables.

## 11. Mail Boundary

The following responsibilities remain distinct:

- Platform notifications send invitations, password resets and security alerts.
- The Mail product provides customer mailboxes, messages, templates and campaigns.
- Mailcow provides SMTP/IMAP infrastructure and is deployed and secured independently from the Mail product application.

## 12. Operational Requirements

Every product must provide:

- Independent build, test, deployment and rollback pipeline
- Container image and environment contract
- `/health` and `/ready` endpoints
- Structured logs with tenant ID, request ID and trace ID
- Metrics, tracing, alerting and error monitoring
- Secrets managed outside Git
- Backward-compatible API and event rollout policy
- Database backup and verified restore procedure
- Tenant isolation, authorization and rate-limit tests
- A product-specific operational runbook

Local development should provide one composition environment that starts the gateway, Platform and selected products while allowing each repository to run independently.

## 13. Delivery Phases

### Current verified position (2026-08-09)

- Platform/HRMS ownership fixtures run against separate local PostgreSQL
  databases and reject cross-database credentials.
- Platform auth, RS256 signing/JWKS, HRMS token issuance, entitlements,
  navigation contracts and independent API composition roots are implemented.
- Focused contract and composition verification passes with 8 suites and 63
  tests; API architecture, API typecheck, API build and web typecheck pass.
- The extracted HRMS runtime compiles independently. Final local HTTP acceptance
  requires starting it with its S3/MinIO environment and running
  `pnpm separation:http:test`.
- Gateway/browser SSO, staging migration/reconciliation, independent rollback,
  production cutover and the observation period are not complete. Therefore the
  compatibility HRMS code must not yet be removed from the original CRM.
- No production database migration, seed, reset, deletion or cutover was
  performed as part of this verification.

### Phase 1: Contracts and ownership

- [ ] Approve product and data ownership.
- [ ] Create repository access and `CODEOWNERS` rules.
- [ ] Create `deltcrm-contracts` and publish initial API/event conventions.
- [ ] Define product manifest schema and validation.
- [ ] Freeze new cross-boundary database access in the current repository.

### Phase 2: Platform control plane

- [ ] Implement product registry and tenant entitlements.
- [ ] Implement centralized token issuance and public-key validation support.
- [ ] Implement navigation API.
- [ ] Implement internal Platform API with service credentials.
- [ ] Establish event broker, outbox relay and dead-letter handling.

### Phase 3: Unified web entry

- [ ] Add gateway path routing for web and API services.
- [ ] Publish application shell, design system, auth client and localization packages.
- [ ] Validate tenant resolution for wildcard and custom domains.
- [ ] Add consistent unauthorized, unavailable and subscription-required pages.

### Phase 4: HRMS extraction

- [ ] Treat the current product as the initial HRMS implementation.
- [ ] Separate Platform-owned identity, tenancy, billing and localization contracts.
- [ ] Move HRMS-owned data behind HRMS APIs without deleting production data.
- [ ] Deploy HRMS behind `/app/hrms` and `/api/hrms`.
- [ ] Verify existing tenant URLs, users and attendance behavior.

### Phase 5: POS and Mail onboarding

- [ ] Implement each product from the approved repository template.
- [ ] Register manifests, permissions, routes and health endpoints.
- [ ] Implement tenant provisioning/suspension consumers.
- [ ] Add subscription activation and navigation.
- [ ] Complete contract, isolation, security and failure-recovery tests.

## 14. Test Plan

### 14.1 Tenant and authentication

- [ ] A user logs in once and opens every entitled product without another login.
- [ ] A token for tenant A cannot access tenant B in any service.
- [ ] Expired, incorrectly signed and wrong-audience tokens are rejected.
- [ ] Disabled users and suspended tenants are rejected across all products.

### 14.2 Entitlements and navigation

- [ ] HRMS-only tenants see and access HRMS but not Mail or POS.
- [ ] HRMS plus Mail tenants see both products under one navigation shell.
- [ ] Direct URLs to unlicensed products return a subscription-required response.
- [ ] Subscription changes update navigation and service access reliably.

### 14.3 Routing and user experience

- [ ] All product routes remain on the tenant subdomain.
- [ ] Browser refresh and deep links work for every routed product page.
- [ ] Header, sidebar, branding, localization and responsive behavior are consistent.
- [ ] Gateway outages and individual product outages show controlled error pages.

### 14.4 Events and provisioning

- [ ] Tenant provisioning is idempotent across duplicate event delivery.
- [ ] Failed consumers retry and eventually enter a visible dead-letter queue.
- [ ] Outbox events survive process restarts.
- [ ] Product suspension and reactivation produce consistent product state.
- [ ] Event schema compatibility is checked in CI.

### 14.5 Data and operations

- [ ] No service can connect to another product's production database.
- [ ] Migrations are forward-only, backed up and restore-tested before production rollout.
- [ ] Cross-service traces preserve request, tenant and event correlation IDs.
- [ ] One product can deploy or roll back without restarting another product.
- [ ] Load tests confirm gateway and entitlement checks meet agreed latency targets.

## 15. Acceptance Criteria

The architecture is ready for product-team adoption when:

1. One tenant subdomain exposes Platform, HRMS, POS and Mail routes through the gateway.
2. One Platform login authorizes users across entitled products.
3. Product navigation is generated from server-side entitlements and permissions.
4. Every product has an approved manifest, API contract, event contract and data owner.
5. No product imports another product's internal code or accesses its database.
6. Tenant provisioning, suspension and subscription changes are idempotent and observable.
7. Shared shell, design system and localization create a consistent desktop and mobile experience.
8. Each product can be built, deployed, monitored and rolled back independently.
9. Security, tenant-isolation, contract, event, routing and disaster-recovery tests pass.
10. Existing production tenant data is migrated without destructive reset, reseed or loss.

## 16. Explicit Non-Goals

- Sharing one Prisma schema or database connection across product repositories
- Duplicating Platform passwords inside product services
- Using iframes to display product frontends
- Using WebSockets as the default service integration mechanism
- Allowing frontend navigation visibility to replace backend authorization
- Extracting production data through destructive migrations or database reseeding
