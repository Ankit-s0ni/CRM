# DeltCRM Product Onboarding and Platform Integration Standard

| Document control   | Value                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| Status             | Canonical engineering standard                                                                           |
| Applies to         | Platform, HRMS, Mail, POS, and every future DeltCRM product                                              |
| Required readers   | Product owner, technical lead, backend, frontend, QA, Security, DevOps, and release owner                |
| Contract baseline  | `@deltcrm/product-contracts` contract v1                                                               |
| Review requirement | Review whenever a contract major version, trust boundary, deployment model, or product lifecycle changes |

## How Every Team Must Use This Standard

1. Read Sections 1-7 before designing a new product or integration.
2. Complete the architecture proposal in Section 7 and obtain boundary approval before assigning public identifiers.
3. Implement Sections 8-25 as part of the product repository and Platform integration work.
4. Convert the checklist in Section 28 into tracked delivery tasks with named owners.
5. Attach the evidence required by Section 29 to the release approval.
6. Do not declare the product integrated until the Definition of Done in Section 31 is satisfied.

Teams may copy the checklist into their own delivery tracker, but this document remains the authoritative standard. Product-specific implementation notes may extend it; they must not silently weaken or contradict it.

## 1. Purpose

This document is the mandatory implementation playbook for connecting an independently developed DeltCRM product, such as Mail, POS, HRMS, or a future product, to the central DeltCRM Platform.

It is written for product developers, platform developers, security reviewers, DevOps engineers, QA engineers, technical leads, and release owners. A product is not considered integrated merely because its page can be opened from the tenant portal. It is integrated only after identity, tenancy, entitlement, authorization, provisioning, routing, localization, observability, operations, and data ownership satisfy this standard.

The intended customer experience is:

```text
One tenant domain
One login and session
One application shell
One language route
One subscription relationship
Multiple independently owned and deployed products
```

Example:

```text
https://acme.blufield.cloud/en/app             Platform home
https://acme.blufield.cloud/en/app/hrms        HRMS
https://acme.blufield.cloud/en/app/mail        Mail
https://acme.blufield.cloud/en/app/pos         POS
```

This standard implements the architecture defined by:

- `MULTI-PRODUCT-PLATFORM-INTEGRATION-IMPLEMENTATION-PLAN.md`
- `PHASE-1-PRODUCT-INTEGRATION-CONTRACT-IMPLEMENTATION-PLAN.md`
- `HRMS-DATA-EXTRACTION-READINESS.md`
- `packages/product-contracts`

## 2. Normative Language

The words below have specific meanings:

- **MUST**: mandatory for integration and release approval.
- **MUST NOT**: prohibited without an approved architecture exception.
- **SHOULD**: expected unless the team documents a justified exception.
- **MAY**: optional and decided by the owning product team.

If this document conflicts with a newer published contract version or an approved Architecture Decision Record, the newer approved artifact wins. The product team must update this document or record the exception so the disagreement is not left implicit.

## 3. Core Architecture Rule

```text
Platform decides WHO the user is and WHICH products/capabilities are available.
Product decides WHAT that user may do with the product's business data.
```

The Platform is the control plane. Products are independent data planes.

The Platform owns:

- tenants and immutable tenant identifiers;
- workspace slugs, tenant domains, and custom-domain mapping;
- user identity, passwords, sessions, MFA, and user lifecycle;
- tenant membership and global access assignments;
- product registry and product manifests;
- plans, subscriptions, product entitlements, limits, and overrides;
- product token issuance and service trust;
- provisioning coordination and status;
- shared navigation and tenant application shell;
- localization governance and tenant locale policy;
- cross-product administrative audit and platform notifications;
- public gateway integration and health aggregation.

Each product owns:

- its frontend and backend;
- its business entities, rules, and workflows;
- its database or isolated schema, migrations, backups, and restore tests;
- product-specific permissions and authorization enforcement;
- product configuration and product audit detail;
- product files, exports, imports, jobs, and background workers;
- product health, readiness, metrics, tracing, alerts, and runbook;
- tenant isolation in every read, write, worker, cache, and file path.

Examples of product-owned data:

| Product | Authoritative product data                                                                         |
| ------- | -------------------------------------------------------------------------------------------------- |
| HRMS    | Employees, organization, offices, attendance, shifts, leave, payroll, HR documents, and HR reports |
| Mail    | Mailboxes, messages, folders, templates, campaigns, and delivery state                             |
| POS     | Locations, catalog, inventory, registers, sales, payments, receipts, and POS reports               |

## 4. Non-Negotiable Prohibitions

A product team MUST NOT:

1. Connect directly to the Platform production database.
2. Read or write another product's tables.
3. Trust a browser-supplied tenant ID, workspace slug, role, or entitlement.
4. Maintain a separate customer password for normal DeltCRM SSO access.
5. Copy Platform authentication, subscription, or tenant implementation code.
6. Publish unversioned APIs or events as cross-product contracts.
7. Place secrets, service credentials, signing keys, or SMTP passwords in Git.
8. Use an iframe as the standard product integration mechanism.
9. Use runtime module federation in the initial integration.
10. Infer tenant identity from a mutable subdomain after authentication.
11. Authorize an operation only because its button is visible in the UI.
12. Run production seeds, `prisma db push`, `prisma migrate reset`, database recreation, truncation, or destructive cleanup during onboarding.
13. Delete product data when an entitlement is disabled or a subscription is suspended.
14. Expose passwords, tokens, bank details, complete government identifiers, or unrestricted object-storage credentials in logs or events.

## 5. Required Repositories and Ownership

The target repository model is:

```text
deltcrm-platform         Central control plane and shared tenant entry
deltcrm-contracts        Versioned schemas and generated clients
deltcrm-design-system    Shell, UI primitives, tokens, typography, and icons
deltcrm-infrastructure   Gateway, DNS, TLS, environments, and observability
deltcrm-hrms             HRMS frontend, backend, workers, and mobile app
deltcrm-mail             Mail frontend, backend, and workers
deltcrm-pos              POS frontend, backend, and device integrations
```

Every product repository MUST include:

```text
product-repository/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/                 # when background work exists
├── packages/
│   └── product-domain/         # optional product-local shared code
├── contracts/
│   └── product-manifest.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA-OWNERSHIP.md
│   ├── SECURITY.md
│   ├── OPERATIONS-RUNBOOK.md
│   └── RELEASE-RUNBOOK.md
├── tests/
│   ├── contract/
│   ├── tenant-isolation/
│   └── integration/
├── .github/workflows/
├── CODEOWNERS
└── README.md
```

Repository access must follow least privilege. `CODEOWNERS` MUST identify at least the product owner, Platform contract reviewer, and security reviewer for integration-sensitive paths.

## 6. Mandatory Integration Surfaces

Every product connects through the following surfaces:

1. Product manifest.
2. Platform-issued product identity token.
3. Effective entitlement contract.
4. Entitled navigation contract.
5. Versioned internal Platform API.
6. Versioned durable events.
7. Idempotent provisioning and suspension lifecycle.
8. Shared gateway route contract.
9. Shared application shell, localization, and design-system contract.
10. Health, readiness, audit, metrics, tracing, and operational contracts.

A custom point-to-point shortcut is not an acceptable replacement for one of these surfaces.

## 7. Product Registration Prerequisites

Before implementation begins, the product team must submit a short architecture proposal containing:

- product name and immutable uppercase product key;
- product owner and technical owner;
- business purpose and customer personas;
- authoritative data owned by the product;
- data explicitly not owned by the product;
- required capabilities and permission keys;
- frontend and API route prefixes;
- events consumed and published;
- synchronous Platform operations required;
- expected tenant provisioning defaults;
- suspension and reactivation behavior;
- data classification and retention requirements;
- expected traffic, storage, worker, and real-time requirements;
- external providers and regional compliance requirements;
- backup, restore, RPO, and RTO requirements.

Platform, Security, DevOps, and the product owner must approve this boundary before the product key or public event names are released. Product keys, capability keys, permission keys, and production event names become stable public identifiers.

## 8. Extend the Shared Contract Registry

The product team must open a reviewed change against `@deltcrm/product-contracts` before using new contract identifiers.

For a new Mail or POS product, the contract change must include:

1. The product key and audience in `ProductKey`, `ProductAudience`, and `PRODUCT_AUDIENCE_BY_KEY`.
2. A complete capability list in `PRODUCT_CAPABILITY_KEYS`.
3. A complete permission list in `PRODUCT_PERMISSION_KEYS`.
4. A versioned product manifest under `manifests/`.
5. Any product-specific public event schemas.
6. OpenAPI changes for new Platform integration operations, if required.
7. Regenerated clients.
8. Contract validation and backward-compatibility tests.
9. Changelog entry and semantic version decision.

The current contract reserves `MAIL`, `POS`, `mail-api`, and `pos-api`, but their capability and permission registries are intentionally empty until their owners define and review them.

The contract package MUST contain data schemas, validators, and generated clients only. It MUST NOT contain Prisma clients, NestJS providers, React components, infrastructure secrets, or product business logic.

Required release checks:

```bash
pnpm --filter @deltcrm/product-contracts typecheck
pnpm --filter @deltcrm/product-contracts build
pnpm --filter @deltcrm/product-contracts test
pnpm --filter @deltcrm/product-contracts compatibility:check
pnpm --filter @deltcrm/product-contracts pack:check
```

The approved version must be published to the private registry. Product repositories pin an approved version; they must not depend on an unpublished workspace path in production.

## 9. Product Manifest

Each product MUST publish one manifest. Capabilities inside a product do not become separate products merely because they have separate screens.

Example Mail manifest:

```json
{
  "contractVersion": "1.0",
  "key": "MAIL",
  "name": "DeltCRM Mail",
  "version": "1.0.0",
  "frontendPathTemplate": "/{locale}/app/mail",
  "apiPath": "/api/mail",
  "healthEndpoint": "/healthz",
  "readinessEndpoint": "/readyz",
  "permissions": [
    "mail.messages.read",
    "mail.messages.send",
    "mail.mailboxes.manage",
    "mail.settings.manage"
  ],
  "capabilities": [
    "MAIL_MAILBOXES",
    "MAIL_MESSAGES",
    "MAIL_CAMPAIGNS"
  ],
  "eventsConsumed": [
    "platform.tenant.provisioned.v1",
    "platform.product.activation-requested.v1",
    "platform.product.suspension-requested.v1"
  ],
  "eventsPublished": [
    "mail.tenant.activated.v1",
    "mail.tenant.activation-failed.v1",
    "mail.tenant.suspended.v1",
    "mail.mailbox.created.v1"
  ]
}
```

Example POS manifest:

```json
{
  "contractVersion": "1.0",
  "key": "POS",
  "name": "DeltCRM POS",
  "version": "1.0.0",
  "frontendPathTemplate": "/{locale}/app/pos",
  "apiPath": "/api/pos",
  "healthEndpoint": "/healthz",
  "readinessEndpoint": "/readyz",
  "permissions": [
    "pos.catalog.read",
    "pos.catalog.manage",
    "pos.inventory.read",
    "pos.inventory.manage",
    "pos.sales.create",
    "pos.sales.refund",
    "pos.settings.manage"
  ],
  "capabilities": [
    "POS_CATALOG",
    "POS_INVENTORY",
    "POS_SALES",
    "POS_REFUNDS"
  ],
  "eventsConsumed": [
    "platform.tenant.provisioned.v1",
    "platform.product.activation-requested.v1",
    "platform.product.suspension-requested.v1"
  ],
  "eventsPublished": [
    "pos.tenant.activated.v1",
    "pos.tenant.activation-failed.v1",
    "pos.tenant.suspended.v1",
    "pos.sale.completed.v1"
  ]
}
```

Manifest requirements:

- The product key, permission keys, and capability keys are immutable after production use.
- Routes must remain below the declared prefixes.
- The manifest version describes the product integration surface, not the current deployment build number.
- The Platform validates the manifest before registration.
- A manifest change must pass compatibility checks.
- A product cannot register undeclared permission, capability, route, or event identifiers at runtime.

## 10. Tenant and Identity Model

### 10.1 Stable identifiers

The Platform creates and owns:

```text
tenantId
userId
membershipId
subscriptionId
```

Products store the Platform identifiers as opaque strings. They MUST NOT derive meaning from their format or replace them with email addresses, subdomains, or local numeric sequences.

The workspace slug is mutable. The `tenantId` is immutable. Renaming `acme.blufield.cloud` must not disconnect Acme's product data.

### 10.2 One customer login

Users authenticate with the Platform. Products do not receive or validate the user's password.

Browser flow:

```text
Browser
  -> Platform login
  -> Secure Platform session cookies
  -> Product-token exchange for the requested audience
  -> Product API validates the short-lived product token
```

Mobile or trusted non-browser clients may use explicit bearer credentials according to the approved client contract. They must not reuse browser cookie assumptions.

### 10.3 Browser cookies and CSRF

Browser access and refresh credentials MUST be server-set cookies with the approved settings:

- `Secure` in production;
- `HttpOnly` for access and refresh credentials;
- approved `SameSite` policy;
- domain scoped to the approved base domain when cross-subdomain behavior requires it;
- bounded lifetime and refresh rotation;
- explicit logout and revocation behavior.

Cookie-authenticated unsafe requests MUST satisfy the approved CSRF mechanism. A service or mobile bearer request must follow its own authentication transport and must not be accidentally treated as a browser-cookie request.

### 10.4 Product token

The Platform issues a short-lived, signed, audience-specific product token. Minimum claims:

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "membershipId": "membership-uuid",
  "roles": ["BUSINESS_ADMIN"],
  "products": ["MAIL"],
  "capabilities": ["MAIL_MAILBOXES", "MAIL_MESSAGES"],
  "permissions": ["mail.messages.read", "mail.messages.send"],
  "iss": "https://auth.blufield.cloud",
  "aud": "mail-api",
  "iat": 1780000000,
  "exp": 1780000900,
  "jti": "token-uuid"
}
```

The product API MUST validate:

1. signature against the approved Platform JWKS/public key;
2. expected issuer;
3. exact product audience;
4. expiration and accepted clock skew;
5. subject and stable identifiers;
6. current tenant status;
7. current user status;
8. current membership status;
9. current subscription and product entitlement;
10. required capability;
11. required product permission;
12. tenant context consistency.

A valid signature alone is not sufficient authorization. Current lifecycle and entitlement state must be checked according to the contract because a user, tenant, or product may have been suspended after token issuance.

## 11. Authorization Model

Authorization is layered:

```text
Authenticated identity
  + active tenant
  + active membership
  + valid subscription
  + active product entitlement
  + enabled capability
  + required product permission
  + product-specific record scope
  = authorized operation
```

The Platform registers and grants product permissions. The product defines their semantics and enforces them.

Examples:

- `mail.messages.read` may list messages but cannot send or delete them.
- `mail.messages.send` may send within the product's policy and mailbox scope.
- `pos.sales.create` may create a sale but cannot issue a refund.
- `pos.sales.refund` must enforce refund limits and approval policy in POS.

Role names are not a substitute for permission checks. A product should evaluate explicit effective permissions and its own record-level rules. Business Admin may receive broad permissions through Platform policy, but the backend still checks each operation.

Navigation hiding is only a user-experience aid. Direct API and deep-link access must be independently denied.

## 12. Entitlements, Capabilities, and Limits

The Platform is authoritative for commercial access.

Example:

```json
{
  "tenantId": "tenant-uuid",
  "subscriptionStatus": "ACTIVE",
  "products": [
    {
      "key": "MAIL",
      "active": true,
      "capabilities": {
        "MAIL_MAILBOXES": true,
        "MAIL_MESSAGES": true,
        "MAIL_CAMPAIGNS": false
      },
      "limits": {
        "mailboxes": 25,
        "storageBytes": 107374182400
      }
    }
  ],
  "version": 42,
  "effectiveAt": "2026-08-05T00:00:00Z"
}
```

Product obligations:

- Check product entitlement and capability server-side.
- Enforce numeric limits under concurrency, not only before showing a form.
- Use transactions or appropriate locking for quota-sensitive writes.
- Return stable errors such as `PRODUCT_NOT_ENTITLED`, `PRODUCT_CAPABILITY_NOT_ENTITLED`, or `PRODUCT_LIMIT_EXCEEDED`.
- Invalidate entitlement caches on subscription and suspension events.
- Prefer short cache lifetimes for authorization-critical state.
- Preserve historical data when access is removed.
- Restore access after reactivation without creating duplicate defaults.

## 13. Internal Platform API

Products use generated clients for synchronous Platform operations. They MUST NOT create page-specific HTTP clients or query Platform storage directly.

Contract v1 operations include identity status, effective entitlements, and provisioning status. Additional approved operations may include notification requests and cross-product audit summaries.

Internal requests require both product identity and a rotating product-scoped service credential:

```http
X-Product-Key: MAIL
X-Product-Service-Key: <runtime-secret>
X-Request-Id: <request-uuid>
traceparent: <w3c-trace-context>
```

Rules:

- Service credentials come from the runtime secret manager.
- Credentials are unique per product and environment.
- Credentials support overlap during rotation.
- A Mail credential cannot access a POS-only internal route.
- `X-Tenant-Id` is context, not proof of identity.
- Calls use explicit connect and response timeouts.
- Retry only safe reads or explicitly idempotent writes.
- Every retryable write carries an `Idempotency-Key`.
- Errors use the shared stable error envelope.
- Correlation and trace identifiers propagate across the full call chain.

## 14. Durable Events and Outbox Pattern

Cross-product lifecycle and business notifications use versioned durable events.

Required envelope:

```json
{
  "eventId": "event-uuid",
  "eventType": "mail.mailbox.created.v1",
  "occurredAt": "2026-08-05T00:00:00Z",
  "producer": "MAIL",
  "tenantId": "tenant-uuid",
  "actorId": "user-uuid",
  "correlationId": "correlation-uuid",
  "schemaVersion": 1,
  "payload": {
    "mailboxId": "mailbox-uuid"
  }
}
```

Producer requirements:

- Persist the domain change and outbox record in the same transaction.
- Never publish an event for a transaction that did not commit.
- Use globally unique event IDs.
- Include only the minimum necessary facts.
- Do not publish passwords, tokens, complete bank details, unrestricted object keys, or unnecessary personal data.
- Treat published schemas as immutable; breaking changes require a new event version.

Consumer requirements:

- Store or otherwise enforce processed `eventId` idempotency.
- Treat duplicate delivery as normal.
- Use bounded exponential retry with jitter.
- Move exhausted poison messages to a visible dead-letter state.
- Expose retry count, last error code, tenant, event type, and correlation ID to operators without exposing sensitive payloads.
- Make handlers safe after process restarts.
- Do not make an unrelated product transaction wait synchronously for event consumers.

## 15. Tenant Provisioning Lifecycle

The Platform coordinates this state machine:

```text
NOT_REQUESTED -> PENDING -> PROVISIONING -> ACTIVE
                               |             |
                               v             v
                             FAILED       SUSPENDED
```

Activation flow:

1. Platform confirms the tenant, subscription, and product entitlement.
2. Platform writes the entitlement change and activation request to its outbox atomically.
3. Product consumes `platform.product.activation-requested.v1`.
4. Product creates or updates its local tenant projection using Platform `tenantId`.
5. Product creates defaults idempotently.
6. Product records activation completion locally.
7. Product publishes `product.tenant.activated.v1` or `product.tenant.activation-failed.v1`.
8. Platform updates provisioning status.
9. Platform navigation exposes the product only according to the approved readiness policy.

Suspension flow:

1. Platform changes the entitlement/subscription state.
2. Platform publishes `platform.product.suspension-requested.v1`.
3. Product blocks new protected operations.
4. Product preserves customer data according to retention policy.
5. Product stops or safely drains tenant-specific workers where required.
6. Product publishes `product.tenant.suspended.v1`.
7. Platform updates status and navigation.

Reactivation repeats activation safely. It MUST NOT create a second product tenant, duplicate mailboxes, duplicate POS locations, or reset customer configuration.

Provisioning failure MUST NOT roll back Platform identity or create duplicate tenant records. Operators need a retry action and an auditable failure code.

## 16. Unified Routing and Gateway

The customer remains on one host. The gateway routes by path:

```text
/{locale}/app                  -> Platform web
/{locale}/app/hrms/*           -> HRMS web
/{locale}/app/mail/*           -> Mail web
/{locale}/app/pos/*            -> POS web

/api/platform/*                -> Platform API
/api/hrms/*                    -> HRMS API
/api/mail/*                    -> Mail API
/api/pos/*                     -> POS API
```

Illustrative gateway configuration:

```nginx
location ~ ^/(en|ar)/app/mail(/|$) {
  proxy_pass http://mail-web;
}

location /api/mail/ {
  proxy_pass http://mail-api;
}
```

Production gateway requirements:

- TLS termination and secure redirects;
- wildcard and approved custom-domain handling;
- request IDs and W3C trace propagation;
- health-aware upstreams;
- explicit connect/read/send timeouts;
- rate and body-size limits;
- forwarded-host/protocol validation;
- WebSocket upgrade only on declared endpoints;
- consistent unauthorized, subscription-required, unavailable, and maintenance responses;
- rollbackable route configuration.

The gateway resolves the tenant host to an immutable `tenantId` through the trusted Platform boundary. Products must still validate that authenticated token tenant and resolved tenant context agree.

## 17. Shared Application Shell and Navigation

The Platform owns the shell: tenant branding, primary navigation, header, language control, notifications entry, theme, and account menu.

The Platform returns entitled navigation entries. Example:

```json
{
  "items": [
    {
      "key": "home",
      "hrefTemplate": "/{locale}/app"
    },
    {
      "key": "mail",
      "hrefTemplate": "/{locale}/app/mail",
      "requiredProduct": "MAIL",
      "requiredCapability": "MAIL_MESSAGES",
      "requiredPermission": "mail.messages.read"
    }
  ]
}
```

Product frontends MUST:

- render within the approved shell composition strategy;
- use shared design-system packages and semantic design tokens;
- preserve tenant host, locale, product path, query string, and valid deep-link state;
- support direct refresh and deep links;
- implement accessible loading, empty, denied, unavailable, and error states;
- avoid duplicating global account, tenant, language, and theme logic;
- remain responsive on desktop, tablet, and mobile;
- support every approved theme without hardcoded colors or typography.

## 18. Localization and Regional Behavior

Tenant product pages use URL-based locale routing:

```text
/en/app/mail
/ar/app/mail
/en/app/pos
/ar/app/pos
```

Requirements:

- Every user-facing string uses the localization catalog.
- English and Arabic catalogs remain structurally complete.
- Arabic is translated content plus correct RTL behavior, not merely an `rtl` direction switch.
- Language switching preserves the current product page and query string.
- Unsupported locales redirect according to tenant policy.
- Dates, times, numbers, currencies, units, and pluralization use locale-aware formatters.
- Regional Arabic packs may override approved terminology without embedding country-specific strings in components.
- Product teams submit translation keys to Platform localization governance.
- Product releases cannot silently introduce unregistered hardcoded interface strings.

## 19. Product Data and Database Isolation

Each product owns its storage lifecycle. Preferred production isolation is a separate database and credential per product. An isolated schema may be a temporary extraction stage only when approved and documented.

Every product data table must have a clear tenant ownership path. Direct tenant-owned tables include `tenantId`; child tables must have an enforced, testable path to a tenant-owned aggregate.

Requirements:

- Scope all queries server-side by authenticated tenant context.
- Add indexes for tenant-scoped high-volume access paths.
- Use row-level security where required by the approved architecture.
- Use product-specific database credentials with least privilege.
- Prevent product credentials from accessing another product's database/schema.
- Maintain independent migrations and migration history.
- Use forward-only, production-compatible migrations.
- Separate additive schema rollout, backfill, application cutover, and later cleanup.
- Encrypt sensitive data according to classification.
- Define retention, legal hold, deletion, and export behavior.
- Maintain encrypted backups and tested restores.

Entitlement removal and suspension do not authorize data deletion. Deletion follows explicit retention and tenant-termination workflows.

## 20. Files and Object Storage

Products own their file metadata and object namespace.

Requirements:

- Use product- and environment-scoped buckets or prefixes.
- Scope object keys by immutable tenant and product identifiers.
- Never expose unrestricted storage credentials to browser or mobile clients.
- Use short-lived signed upload/download operations.
- Validate content type, extension, size, ownership, and malware policy server-side.
- Record file audit and retention metadata.
- Deny cross-tenant object access even when an object key is guessed.
- Include object storage in backup/restore and disaster-recovery planning.

## 21. Notifications and Mail Infrastructure Boundary

Platform notifications and the Mail product are separate concerns:

- Platform notification delivery sends account invitations, password resets, security alerts, and Platform operational messages.
- The Mail product provides customer mailboxes, messages, templates, campaigns, and related customer workflows.
- Mailcow or another SMTP/IMAP provider supplies mail infrastructure and is deployed, secured, backed up, and monitored independently.

A product requests Platform notification delivery through an approved API/event contract. It must not import the Platform mailer or receive the Platform SMTP password.

## 22. Audit and Attribution

Both Platform and product keep appropriate audit evidence.

Platform audit includes:

- login and security lifecycle;
- product entitlement and subscription changes;
- product activation, failure, suspension, and reactivation;
- service credential and signing-key administration;
- cross-product impersonation or support actions.

Product audit includes:

- sensitive product configuration changes;
- product record creation, update, deletion, approval, and export;
- actor, tenant, timestamp, source, request, and correlation identifiers;
- before/after values where safe and required;
- automated or event-driven origin when no human actor exists.

Products forward only approved cross-product summaries to Platform. Sensitive product details remain in the owning product unless there is an approved compliance requirement.

## 23. Observability and Operations

Every product MUST expose:

```text
/healthz   Process/liveness signal
/readyz    Dependency/readiness signal
```

Every product must provide:

- structured logs with product, environment, tenant ID, request ID, and trace ID where applicable;
- metrics for requests, errors, latency, jobs, retries, dead letters, provisioning, and critical domain operations;
- distributed trace propagation across gateway, Platform, product APIs, workers, and providers;
- alert thresholds and named responders;
- dashboards for product health and provisioning status;
- safe error reporting without secrets or unnecessary personal data;
- dependency failure and degraded-mode behavior;
- an operations runbook and rollback procedure.

Readiness must fail when a dependency required to serve traffic is unavailable. Liveness should not fail merely because a recoverable external dependency is temporarily down.

## 24. Local Development Composition

Local development should allow each product repository to run independently while a composition environment provides:

- local gateway;
- Platform web and API;
- selected product web/API/worker;
- PostgreSQL instances or isolated local databases;
- Redis/event broker when required;
- object storage when required;
- local secrets or documented development-only credentials;
- test tenant, entitlements, and identities;
- `en` and `ar` routing.

Local shortcuts must not weaken production authorization. A development bypass must be explicit, disabled by default in production, and covered by startup fail-fast validation.

## 25. CI/CD Requirements

Each product pipeline must contain these stages.

### 25.1 Pull-request gates

- formatting and lint;
- typecheck;
- unit tests;
- contract validation;
- generated-client drift check;
- architecture/dependency rules;
- tenant-isolation and authorization tests;
- migration safety review when schema changes;
- localization catalog and hardcoded-string audit for UI changes;
- responsive/accessibility checks for UI changes;
- secret and dependency scanning;
- production build for frontend, API, and workers.

### 25.2 Release gates

- immutable version and image tag;
- signed or provenance-tracked artifact;
- approved contract version pinned;
- environment configuration validated at startup;
- migration status reviewed;
- backup verified before production schema work;
- rollback version and route available;
- smoke-test plan approved;
- release notes and runbook updated.

### 25.3 Deployment order

For backward-compatible changes:

1. Publish compatible contracts.
2. Deploy tolerant consumers.
3. Deploy producers or Platform changes.
4. Apply additive database migrations with the approved production command.
5. Deploy product API/workers.
6. Deploy product web.
7. Enable gateway route or feature flag for an internal tenant.
8. Run smoke and reconciliation checks.
9. Expand tenant activation gradually.
10. Perform cleanup only in a later approved release.

Production Prisma migration uses `prisma migrate deploy`, never `migrate dev`, reset, seed, or `db push`.

## 26. Testing Matrix

### 26.1 Contract

- Manifest validates.
- Unknown product, permission, and capability keys fail.
- Generated client matches OpenAPI.
- Backward-incompatible contract changes fail without a major/new event version.
- Published package artifact is importable without monorepo-only files.

### 26.2 Authentication

- One Platform login opens an entitled product without another password.
- Expired token is rejected.
- Wrong issuer is rejected.
- Wrong audience is rejected.
- Wrong signature is rejected.
- Revoked/disabled user is rejected.
- Suspended tenant and membership are rejected.
- Product-token exchange cannot request an unauthorized audience.

### 26.3 Tenant isolation

- Tenant A token cannot read Tenant B records.
- Tenant A token cannot mutate Tenant B records.
- Tenant A worker cannot process Tenant B job context accidentally.
- Tenant A cannot download Tenant B files or exports.
- Cache keys include tenant context.
- Search, pagination, bulk actions, reports, and admin paths remain tenant-scoped.

### 26.4 Entitlement and authorization

- Product-disabled tenant is denied by API and direct URL.
- Capability-disabled tenant is denied only for that capability.
- Read permission cannot perform manage/write operations.
- Quotas are correct under concurrent requests.
- Entitlement removal is effective without stale authorization.
- Historical data is preserved while access is blocked.
- Reactivation restores access without duplicate setup.

### 26.5 Provisioning and events

- Duplicate activation delivery creates one tenant projection.
- Retry after partial provider failure is safe.
- Outbox survives restart.
- Poison event reaches visible dead-letter state.
- Suspension and reactivation converge correctly.
- Correlation IDs remain traceable across the lifecycle.

### 26.6 Routing and shell

- English and Arabic routes reach the same product deployment.
- Language switching preserves deep links and query parameters.
- Browser refresh works on nested product routes.
- Unsupported locale follows tenant policy.
- API routes remain locale independent.
- Subscription-required, unauthorized, unavailable, and maintenance states are controlled.
- Mobile/tablet/desktop layouts and all supported themes work.

### 26.7 Failure and recovery

- Platform temporarily unavailable.
- Product dependency unavailable.
- Event broker unavailable.
- Redis unavailable.
- Provider timeout and rate limit.
- Database failover/restart.
- Worker restart during processing.
- Backup restoration in an isolated environment.
- Gateway rollback to previous upstream.

## 27. Production Data-Safety Procedure

No onboarding release may risk existing tenant data.

Before schema or extraction work:

1. Confirm the target environment and database identity explicitly.
2. Review pending migrations and generated SQL.
3. Reject destructive SQL, implicit table recreation, or unbounded backfills.
4. Capture approved baseline counts and domain-specific digests.
5. Take an encrypted backup.
6. Verify backup integrity.
7. Restore that backup into an isolated environment.
8. Run count and representative workflow checks against the restore.
9. Record rollback ownership and decision thresholds.

During release:

1. Use additive, forward-only migrations.
2. Keep old and new application versions compatible during rollout.
3. Monitor errors, latency, provisioning, and data reconciliation.
4. Stop rollout on a threshold breach.
5. Roll back application/gateway traffic without deleting newly written data.

After release:

1. Capture post-release counts and digests.
2. Compare against approved expectations.
3. Run tenant-specific smoke tests.
4. Retain evidence and backup references.
5. Schedule destructive cleanup separately after the compatibility window.

Never use a seed, reset, truncate, drop, `db push`, or database recreation as a production deployment shortcut.

## 28. Product Onboarding Execution Checklist

### Stage A: Discovery and approval

- [ ] Product owner and technical owner named.
- [ ] Authoritative data ownership documented.
- [ ] Platform/product boundary approved.
- [ ] Data classification, retention, RPO, and RTO approved.
- [ ] Product key, audience, routes, permissions, capabilities, and events approved.
- [ ] External providers and compliance requirements reviewed.

### Stage B: Contract release

- [ ] Contract registry updated.
- [ ] Manifest added and validated.
- [ ] Event schemas added.
- [ ] OpenAPI/generated clients updated when needed.
- [ ] Compatibility checks pass.
- [ ] Private package version published and pinned.

### Stage C: Product implementation

- [ ] Platform token validation implemented.
- [ ] Current identity and entitlement validation implemented.
- [ ] Product authorization and record scope implemented.
- [ ] Tenant isolation implemented in API, workers, caches, search, files, and reports.
- [ ] Internal Platform client uses product-scoped credentials.
- [ ] Outbox and idempotent consumers implemented.
- [ ] Provisioning, suspension, and reactivation implemented.
- [ ] Health, readiness, logs, metrics, traces, and audit implemented.

### Stage D: Unified frontend

- [ ] Product routes remain under `/{locale}/app/{product}`.
- [ ] Shared shell and navigation contract integrated.
- [ ] English and Arabic catalogs complete.
- [ ] RTL, themes, responsive layouts, and accessibility verified.
- [ ] Deep links, refresh, and language switching verified.
- [ ] Unauthorized and unavailable states implemented.

### Stage E: Infrastructure and security

- [ ] Gateway routes reviewed and rollbackable.
- [ ] DNS/TLS/custom-domain behavior verified.
- [ ] Secrets stored outside Git.
- [ ] Signing keys/service credentials support rotation.
- [ ] Database and object storage isolated.
- [ ] Rate limits, timeouts, and body limits defined.
- [ ] Security and privacy review completed.

### Stage F: Verification and release

- [ ] Contract, auth, entitlement, isolation, event, routing, and recovery tests pass.
- [ ] Clean-checkout CI artifacts retained.
- [ ] Backup and isolated restore drill pass when data/schema work is involved.
- [ ] Baseline reconciliation captured.
- [ ] Internal tenant/canary activation passes.
- [ ] Post-release reconciliation and smoke tests pass.
- [ ] Operations handoff and on-call ownership confirmed.

## 29. Required Integration Evidence

The product team must attach the following evidence to its release approval:

- approved architecture/data ownership document;
- reviewed manifest and contract package version;
- API and event compatibility results;
- identity, tenant isolation, RBAC, and entitlement test results;
- provisioning duplicate/retry/dead-letter evidence;
- English/Arabic, RTL, theme, responsive, and accessibility evidence;
- gateway route and rollback configuration;
- health/readiness and observability screenshots or query links;
- migration review, backup reference, and isolated restore evidence where applicable;
- smoke-test and reconciliation results;
- operations runbook and named owners.

An informal statement that the product “works locally” is not release evidence.

## 30. Architecture Exception Process

If a product cannot meet a rule:

1. Document the exact rule and business reason.
2. Describe security, data, coupling, and operational impact.
3. Propose a time-bounded alternative and removal plan.
4. Add automated checks that keep the exception inside its approved boundary.
5. Obtain Platform, Security, Data, and product-owner approval as applicable.
6. Record the decision in an ADR with an expiry/review date.

An undocumented shortcut is a defect, not an exception.

## 31. Definition of Done

A product is connected to DeltCRM only when all of the following are true:

1. It is independently owned, built, tested, deployed, rolled back, backed up, and restored.
2. Its public identifiers and manifest are published through the approved contract package.
3. It accepts Platform identity without receiving customer passwords.
4. It validates current tenant, user, membership, subscription, entitlement, capability, permission, and record scope server-side.
5. It never reads Platform or another product's database directly.
6. It provisions, suspends, retries, and reactivates idempotently.
7. It appears under the same tenant host and locale-aware application shell.
8. It is fully localized, RTL-safe, theme-safe, responsive, and accessible.
9. It exposes health, readiness, audit, logs, metrics, traces, alerts, and an operations runbook.
10. Contract, security, isolation, routing, event, failure, backup, and recovery evidence is approved.
11. Existing production data has been preserved and reconciled.

Only after this definition is satisfied may a product be generally enabled for customer tenants.
