# Dynamic Product Registry Corrective Implementation Plan

| Document control | Value |
| --- | --- |
| Status | Approved implementation plan — work not yet completed |
| Priority | P0 — complete before starting Mail, POS, or another product integration |
| Applies to | Delsia Platform, product contracts, HRMS, gateway/deployment tooling, and every future product |
| Supersedes | The hardcoded product-registration process in `PRODUCT-ONBOARDING-AND-PLATFORM-INTEGRATION-STANDARD.md` Section 8 and `PRODUCT-INTEGRATION-AND-DEPLOYMENT-GUIDE.md` Section 3 |
| Success condition | A new product can be registered, entitled, launched, authenticated, provisioned, monitored, and removed without modifying or redeploying Platform application code or changing the shared contract package |

## 1. Why this correction is required

The present Platform-to-HRMS boundary proves the security and deployment model,
but it is still implemented as an HRMS-specific integration.

Current evidence:

- `ProductKey` and `ProductAudience` are closed TypeScript unions containing
  `HRMS`, `MAIL`, and `POS`.
- the contract registry contains complete HRMS permissions and capabilities but
  empty Mail and POS definitions;
- Platform's product integration service rejects every manifest and token
  audience except HRMS;
- Platform calculates effective entitlements with explicit Attendance, Payroll,
  Leave, Field Tracking, and HRMS branches;
- lifecycle resolution is HRMS-specific;
- the Platform catalog still stores HRMS features in the legacy `Module` model;
- the Modules screen exposes these records as direct tenant switches even though
  plan-derived entitlements are intended to be authoritative;
- Platform and HRMS are pinned to published contract package `1.0.0`, while the
  current contract repository is `1.1.0`.

If left unchanged, every product would require coordinated edits and releases in
the product-contract and Platform repositories. That is not the target product
platform.

## 2. Non-negotiable target behavior

After this plan is complete, onboarding a product consists of configuration and
deployment operations, not Platform feature development:

1. The product installs a supported generic integration SDK/contract version.
2. The product implements token verification, health, readiness, and lifecycle
   endpoints/consumers.
3. The product publishes a signed, versioned manifest from its own repository.
4. An authorized Platform operator or CI service registers the manifest.
5. Platform validates and stores an immutable manifest revision.
6. Platform administrators attach the registered capabilities, add-ons, and
   limits to plans.
7. Platform derives tenant entitlements from subscriptions and bounded
   overrides.
8. Platform issues a product-specific token using registry data.
9. Navigation, health, provisioning, audit, and lifecycle delivery work through
   generic services.
10. Deployment tooling configures DNS, TLS, gateway upstreams, secrets, and
    product infrastructure without changing Platform application source.

Adding a product may still require deploying that product and adding approved
infrastructure configuration. It must not require:

- adding the product key to a TypeScript union;
- adding permission or capability constants to the shared package;
- editing Platform token, entitlement, navigation, lifecycle, or health code;
- republishing the shared package merely because a product was added; or
- redeploying Platform application containers.

## 3. Ownership model

### 3.1 Shared contract owns the protocol

The shared contract package defines only stable, product-neutral protocol
structures:

- manifest schema and runtime validator;
- product-token claims and token response;
- effective entitlement structure;
- navigation descriptor structure;
- lifecycle/event envelope;
- provisioning states;
- standard error codes;
- compatibility, signing, hashing, and deprecation rules;
- generated clients for generic Platform integration endpoints.

The shared package changes only when the protocol changes. A new Mail
capability, POS permission, or entirely new product does not change the shared
package.

### 3.2 Product owns its descriptor

Each product repository owns:

- immutable product key and API audience;
- display metadata and navigation entry;
- route prefixes;
- permissions and their descriptions;
- capabilities, dependencies, and conflicts;
- typed usage/limit metrics;
- lifecycle endpoints or consumed events;
- published event declarations;
- health/readiness declarations;
- supported locales and product-owned translation namespaces;
- product manifest history and signature.

### 3.3 Platform owns registration and commercial state

Platform owns:

- the approved product and manifest-revision registry;
- environment-specific product deployment endpoints;
- plans, pricing, add-ons, subscriptions, limits, and overrides;
- effective tenant product entitlements;
- Platform roles and assignment of registered product permission keys;
- product token issuance;
- lifecycle orchestration and provisioning state;
- unified navigation, audit, health, and support views.

## 4. Canonical product manifest

The manifest must be data, validated at runtime. Environment-specific secrets
and internal hostnames must not be embedded in it.

```json
{
  "schemaVersion": 2,
  "productKey": "MAIL",
  "manifestVersion": "1.0.0",
  "displayName": "Delsia Mail",
  "description": "Business email and collaboration",
  "audience": "mail-api",
  "routes": {
    "webPath": "/{locale}/app/mail",
    "apiPrefix": "/api/mail/v1"
  },
  "navigation": {
    "key": "mail",
    "labelKey": "products.mail.name",
    "iconKey": "mail"
  },
  "permissions": [
    {
      "key": "mail.messages.read",
      "description": "Read permitted mailboxes"
    },
    {
      "key": "mail.messages.send",
      "description": "Send messages from permitted mailboxes"
    }
  ],
  "capabilities": [
    {
      "key": "MAIL_CORE",
      "description": "Core mailbox and message operations",
      "required": true
    },
    {
      "key": "MAIL_ARCHIVE",
      "description": "Long-term message archive",
      "required": false
    }
  ],
  "limits": [
    {
      "key": "MAIL_MAILBOXES",
      "unit": "COUNT",
      "enforcement": "HARD"
    },
    {
      "key": "MAIL_STORAGE_GB",
      "unit": "GIGABYTES",
      "enforcement": "HARD"
    }
  ],
  "lifecycle": {
    "mode": "EVENT",
    "consumes": [
      "platform.product.activation-requested.v1",
      "platform.product.suspension-requested.v1",
      "platform.product.reactivation-requested.v1",
      "platform.product.deletion-requested.v1"
    ],
    "publishes": [
      "mail.product.activated.v1",
      "mail.product.activation-failed.v1",
      "mail.product.suspended.v1"
    ]
  },
  "health": {
    "livenessPath": "/healthz",
    "readinessPath": "/readyz"
  },
  "localization": {
    "supportedLocales": ["en", "ar"],
    "namespaces": ["mail"]
  }
}
```

### 4.1 Manifest invariants

- Product keys match `^[A-Z][A-Z0-9_]{1,63}$` and are globally unique.
- Audiences match `^[a-z][a-z0-9-]{1,63}-api$` and are globally unique.
- Permission keys are namespaced by the lowercase product key.
- Capability and limit keys are namespaced by the uppercase product key.
- Product key, audience, and used permission/capability/limit keys are immutable.
- Manifest revisions are immutable and addressed by version plus SHA-256 hash.
- Routes are normalized and cannot collide with Platform or another product.
- A manifest cannot declare arbitrary external URLs or credentials.
- Removed public identifiers require a deprecation window and cannot disappear
  while active plans, roles, or tenants reference them.
- Unknown additive fields are tolerated according to the declared schema and
  compatibility range; incompatible schema versions are rejected.

## 5. Target Platform data model

Add a clean registry model rather than extending HRMS branches in the existing
`Module` table.

### 5.1 Registry entities

- `RegisteredProduct`
  - stable ID, immutable product key, audience, status, active revision,
    created/updated audit fields;
- `ProductManifestRevision`
  - product ID, manifest version, schema version, canonical JSON, hash,
    signature metadata, validation result, registration status, timestamps;
- `ProductPermissionDefinition`
  - revision/product ID, immutable key, description, deprecation state;
- `ProductCapabilityDefinition`
  - revision/product ID, immutable key, description, required flag,
    dependency/conflict metadata, deprecation state;
- `ProductLimitDefinition`
  - revision/product ID, immutable key, unit, enforcement mode;
- `ProductEventDefinition`
  - revision/product ID, direction, event key, schema version;
- `ProductDeployment`
  - product ID, environment, internal API endpoint reference, web upstream
    reference, region, health state, maintenance state;
- `ProductServiceCredential`
  - product ID, credential/key identifier, state, rotation timestamps; secrets
    remain in the secret manager rather than plaintext database columns.

### 5.2 Commercial and tenant entities

- `PlanProductGrant`
- `PlanCapabilityGrant`
- `PlanLimitGrant`
- `PlanAddOnGrant` or a generic subscription-line/SKU model
- `TenantProductOverride`
- `TenantCapabilityOverride`
- `TenantLimitOverride`
- `EffectiveTenantEntitlement`
- `ProductProvisioningInstance`
- `ProductLifecycleDelivery`
- `ProductUsageSnapshot`

Every override records reason, approver, start, expiry, and audit reference.
Effective entitlement rows are a versioned projection, not a second manually
maintained source of truth.

## 6. Target generic APIs

### 6.1 Operator registration APIs

```text
POST   /platform/products/registrations/validate
POST   /platform/products
GET    /platform/products
GET    /platform/products/:productKey
POST   /platform/products/:productKey/revisions
POST   /platform/products/:productKey/revisions/:version/activate
POST   /platform/products/:productKey/suspend
GET    /platform/products/:productKey/health
GET    /platform/products/:productKey/provisioning
POST   /platform/products/:productKey/credentials/rotate
```

Registration and activation require Platform authorization, fresh MFA,
idempotency keys, manifest signature/hash validation, and audit records.

### 6.2 Tenant and application APIs

```text
GET    /product-integration/catalog
GET    /product-integration/navigation
GET    /product-integration/entitlements
POST   /product-integration/token
GET    /product-integration/products/:productKey/provisioning
```

The preferred token request becomes:

```json
{ "productKey": "MAIL" }
```

Platform resolves the approved audience from the active registry revision. The
existing `{ "audience": "hrms-api" }` request remains as a temporary
compatibility adapter during HRMS migration and is then deprecated.

### 6.3 Internal product APIs

Generic signed/service-authenticated APIs expose only the current product's
scope:

```text
GET /internal/platform/v1/products/:productKey/identity/:userId
GET /internal/platform/v1/products/:productKey/tenants/:tenantId/entitlements
GET /internal/platform/v1/products/:productKey/tenants/:tenantId/provisioning
PUT /internal/platform/v1/products/:productKey/tenants/:tenantId/usage
```

The authenticated product identity must match the requested product key.

## 7. Implementation phases

## Phase 0 — Freeze hardcoded expansion and establish safety tests

- [ ] Mark the current closed product registry, HRMS-only integration branches,
  and legacy module-assignment endpoint as transitional/deprecated.
- [ ] Prohibit new `if/switch` product branches in token, entitlement,
  navigation, lifecycle, health, and provisioning services.
- [ ] Add an architecture test that fails when generic Platform integration
  code imports `HRMS_MANIFEST`, `HRMS_CAPABILITIES`, or `HRMS_PERMISSIONS`.
- [ ] Add an architecture test that fails when generic services contain the
  literals `HRMS`, `ATTENDANCE`, `PAYROLL`, `LEAVE`, or `FIELD_TRACKING` outside
  fixtures and compatibility adapters.
- [ ] Capture current HRMS entitlement, token, navigation, provisioning, and
  lifecycle behavior as regression fixtures.
- [ ] Record the currently installed and published contract versions in all
  repositories.

### Phase 0 exit gate

Current HRMS behavior is protected, and CI prevents additional product-specific
coupling.

## Phase 1 — Convert the shared package into a generic protocol SDK

- [x] Replace closed `ProductKey` and `ProductAudience` unions with validated
  branded strings/runtime schemas.
- [x] Remove `PRODUCT_AUDIENCE_BY_KEY`, `PRODUCT_CAPABILITY_KEYS`, and
  `PRODUCT_PERMISSION_KEYS` as authoritative product catalogs.
- [x] Retain deprecated HRMS aliases only for the migration window.
- [x] Add the schema-v2 manifest definition and validator.
- [x] Add canonical JSON serialization, content hashing, optional signature
  verification, and compatibility-range validation.
- [x] Add generic permission, capability, limit, route, navigation, lifecycle,
  health, and localization descriptors.
- [x] Add generic registration and registry-query client methods to OpenAPI and
  regenerate the client.
- [x] Add backward-compatibility tests for the existing HRMS v1 manifest and
  token claims.
- [x] Publish the generic SDK as an explicit semantic version. Treat removal of
  closed registries as a major release unless compatibility tests prove the
  change is safely additive.
- [x] Pin Platform and HRMS to the same newly published version.
- [x] Add CI checks rejecting workspace copies, floating versions, and mixed
  supported protocol versions.

### Phase 1 exit gate

An unknown but schema-valid product manifest can be parsed and validated by the
shared SDK without editing or rebuilding that SDK.

## Phase 2 — Add the Platform registry schema and migration

- [ ] Add the registry, manifest revision, descriptor, deployment, credential,
  provisioning, lifecycle delivery, and effective entitlement models described
  in Section 5 to the Platform-only Prisma schema.
- [ ] Generate additive migrations; do not delete or rewrite applied migration
  history.
- [ ] Add uniqueness constraints for product key, audience, route prefix, and
  manifest version/hash.
- [ ] Add foreign-key/reference protection preventing removal of identifiers
  used by plans, roles, subscriptions, tenants, or audit records.
- [ ] Add optimistic concurrency/version columns for registration and
  entitlement updates.
- [ ] Add indexes for product status, tenant entitlement lookup, lifecycle
  delivery, health, and usage reconciliation.
- [ ] Add repository tests against the Platform database.

### Phase 2 exit gate

Platform can persist multiple arbitrary product manifests and revisions without
using the legacy module catalog.

## Phase 3 — Implement secure manifest registration

- [ ] Implement validate, register, revise, activate, suspend, and inspect
  application services and APIs.
- [ ] Canonicalize the manifest before hashing and storing it.
- [ ] Validate identifier namespaces, dependency graphs, conflicts, route
  collisions, schema compatibility, and immutable identifiers.
- [ ] Reject unknown lifecycle modes and undeclared event schemas.
- [ ] Separate environment deployment endpoints from the portable manifest.
- [ ] Restrict registration to Platform operators/CI identities with fresh MFA
  and least-privilege permissions.
- [ ] Require idempotency keys for writes.
- [ ] Audit every validation, registration, activation, rejection, suspension,
  and credential rotation action.
- [ ] Protect health/provisioning HTTP targets against SSRF: only approved
  deployment records and private service discovery destinations are callable.
- [ ] Add a CLI command and CI workflow that validate and register a manifest
  using a service identity; never embed an operator password or registry token.

### Phase 3 exit gate

A product repository can register a new immutable manifest revision through CI,
and invalid or unsafe manifests fail closed with actionable errors.

## Phase 4 — Make token issuance and product authorization generic

- [ ] Replace HRMS-only `manifest()` and audience mapping with active registry
  lookups.
- [ ] Resolve token audience, product key, capabilities, permissions, limits,
  locale, and entitlement version from registry and effective tenant state.
- [ ] Filter user permissions by registered product namespace instead of calling
  an HRMS permission mapper.
- [ ] Reject token issuance for unregistered, suspended, unprovisioned,
  unhealthy-as-policy, unsubscribed, or tenant-disabled products.
- [ ] Preserve RS256/JWKS validation, issuer, audience, subject, tenant,
  membership, JTI, expiry, and entitlement-version checks.
- [ ] Add key rotation and stale-token revocation tests.
- [ ] Provide reusable Node/Nest token-verifier helpers; document JWKS validation
  for non-Node products without requiring them to import Platform code.
- [ ] Keep HRMS's current guard as a product-specific thin wrapper over the
  generic verifier until its migration is complete.

### Phase 4 exit gate

The same token service issues correctly scoped tokens for HRMS and an arbitrary
test product using registry data only.

## Phase 5 — Implement one commercial entitlement resolver

- [ ] Make the subscription plan, product grants, capabilities, add-ons, typed
  limits, subscription state, and bounded overrides the only entitlement
  inputs.
- [ ] Resolve all products with the same algorithm; remove HRMS-specific
  Attendance/Payroll/Leave calculations from generic Platform code.
- [ ] Materialize a versioned effective entitlement projection transactionally.
- [ ] Increment entitlement version whenever access-relevant state changes.
- [ ] Publish a generic `platform.entitlements.changed.v1` event through the
  outbox after transaction commit.
- [ ] Enforce dependency/conflict rules declared in the registered manifest.
- [ ] Define suspension, grace, past-due, cancellation, downgrade, and override
  behavior once for every product.
- [ ] Add usage reporting and reconciliation using registered limit keys.
- [ ] Prevent direct module toggles from bypassing plan/add-on resolution.

### Phase 5 exit gate

No generic entitlement service contains HRMS feature names, and plans can grant
capabilities/limits for an arbitrary registered product.

## Phase 6 — Make lifecycle, provisioning, health, and navigation generic

- [ ] Generate activation, suspension, reactivation, deletion, and entitlement
  events from registry and tenant state, not HRMS lifecycle functions.
- [ ] Use the standard event envelope, idempotency key, correlation ID,
  schema version, retry policy, dead-letter policy, and replay controls.
- [ ] Track provisioning separately for every `(tenantId, productKey)`.
- [ ] Validate product acknowledgements against the authenticated product
  identity and declared event set.
- [ ] Resolve navigation entries from active manifests plus tenant entitlement
  and user permissions.
- [ ] Resolve health/readiness checks from approved `ProductDeployment` records.
- [ ] Add generic unavailable, provisioning, suspended, subscription-required,
  and permission-denied states.
- [ ] Add worker tests covering multiple products in the same batch and proving
  one failing product cannot block another product indefinitely.

### Phase 6 exit gate

Provisioning, lifecycle delivery, health, and navigation operate for arbitrary
registered products with no product-name branches.

## Phase 7 — Replace the legacy Modules screen

- [ ] Rename `/platform/modules` to the Product Catalog and Entitlements area;
  retain a temporary redirect/bookmark-compatible route if required.
- [ ] Display registered top-level products from the new registry.
- [ ] Display each product's manifest version, status, routes, health,
  capabilities, permissions, limits, events, and deployment state.
- [ ] Move plan configuration to product capability/add-on/limit grants.
- [ ] Show effective tenant entitlements as a calculated result with source
  attribution: subscription, add-on, override, or suspension.
- [ ] Permit exceptional tenant overrides only with permission, fresh MFA,
  reason, expiry, impact preview, and audit.
- [ ] Remove Attendance, Leave, and Payroll as independent Platform products.
- [ ] Represent HRMS as one product; represent Attendance, Leave, Payroll,
  Biometrics, Field Tracking, and Regularization as HRMS capabilities/add-ons.
- [ ] Remove direct generic `PUT /platform/tenants/:id/modules` usage after all
  callers migrate; retain a time-boxed compatibility adapter only if needed.

### Phase 7 exit gate

The operator UI cannot create a state that contradicts the plan resolver, and
the screen accurately represents product -> capability/add-on -> limit.

## Phase 8 — Migrate HRMS without breaking users

- [ ] Convert the existing HRMS v1 descriptor into a schema-v2 manifest in the
  HRMS repository.
- [ ] Register HRMS through the same registration API/CI workflow used by all
  future products.
- [ ] Map legacy Platform records:
  - `HRMS` -> registered product;
  - `ATTENDANCE` -> `HRMS_ATTENDANCE` capability;
  - `LEAVE` -> `HRMS_LEAVE` capability;
  - `PAYROLL` -> `HRMS_PAYROLL` capability;
  - `FIELD_TRACKING` -> `HRMS_FIELD_TRACKING` add-on/capability;
  - `REGULARIZATION` -> `HRMS_REGULARIZATION` add-on/capability;
  - `ATTENDANCE_SELFIE` -> the approved HRMS biometric/facial-attendance
    capability.
- [ ] Migrate plan grants and tenant assignments with an idempotent migration
  ledger.
- [ ] Run old-versus-new entitlement comparison for every tenant and block
  cutover on unexplained differences.
- [ ] Dual-read in observation mode, then switch token, navigation, and
  lifecycle reads to the generic registry.
- [ ] Preserve entitlement version behavior so active HRMS sessions fail closed
  and refresh cleanly after changes.
- [ ] Move HRMS permission definitions into the HRMS manifest while preserving
  existing stable permission keys.
- [ ] Run Platform, HRMS web, HRMS API, worker, gateway, and mobile regression
  suites.
- [ ] Stop dual reads only after reconciliation and rollback evidence pass.

### Phase 8 exit gate

Existing HRMS tenants receive the same intended access through the generic
registry, and Platform contains no HRMS-specific authorization or entitlement
logic outside the migration adapter.

## Phase 9 — Prove zero-code onboarding with an ECHO reference product

Create a minimal independently deployable `ECHO` fixture/reference product. It
is a test product, not a Platform source-code branch.

- [ ] Implement `/healthz`, `/readyz`, one protected API, and lifecycle
  acknowledgements.
- [ ] Publish an ECHO manifest defining one permission, one capability, and one
  numeric limit.
- [ ] Register it using only the public registration workflow.
- [ ] Add it to a plan through Platform APIs/UI.
- [ ] Subscribe a sandbox tenant and complete provisioning.
- [ ] Confirm navigation appears only for an entitled and permitted user.
- [ ] Exchange a Platform session for an `echo-api` product token.
- [ ] Confirm ECHO validates JWKS, issuer, audience, tenant, identity,
  entitlement version, capability, permission, and expiry.
- [ ] Change the plan and prove stale tokens fail and refreshed tokens reflect
  the new entitlement.
- [ ] Suspend, reactivate, and delete the tenant product instance through the
  generic lifecycle.
- [ ] Verify health, audit, outbox retry, dead letter, replay, and usage/limit
  reporting.
- [ ] Record a clean Platform and shared-contract Git diff proving no product
  source identifiers or branches were added for ECHO.

### Phase 9 exit gate

ECHO is fully integrated without changing or republishing the shared contract
package and without modifying or redeploying Platform application code. Only
manifest registration, plan configuration, product deployment, and approved
gateway/DNS/environment configuration are permitted.

## Phase 10 — Remove compatibility code and correct documentation

- [ ] Remove closed Mail/POS placeholder registries from the shared package.
- [ ] Remove HRMS-only manifest and audience resolution from Platform.
- [ ] Remove HRMS entitlement mapping and lifecycle resolution from generic
  Platform services.
- [ ] Retire the legacy module-assignment endpoint and UI.
- [ ] Remove dual-read/migration adapters after the rollback window.
- [ ] Update `PRODUCT-ONBOARDING-AND-PLATFORM-INTEGRATION-STANDARD.md` so a new
  product supplies a manifest rather than editing the contract registry.
- [ ] Update `PRODUCT-INTEGRATION-AND-DEPLOYMENT-GUIDE.md` with registration,
  approval, rollback, and environment deployment commands.
- [ ] Add a product starter template containing manifest, contract tests,
  verifier, lifecycle consumer, health endpoints, CI registration workflow,
  and operational documentation.
- [ ] Add an architecture decision record declaring the registry the only
  product-discovery source of truth.

### Phase 10 exit gate

No active document or starter repository instructs a team to edit Platform or
the shared contract merely to add a product.

## 8. Security and operational requirements

- Registration is never anonymous or tenant-admin accessible.
- Product manifests are untrusted input until schema, policy, hash/signature,
  route, namespace, dependency, and compatibility validation succeeds.
- A registered product cannot request another product's permissions,
  entitlements, usage, credentials, or tenant data.
- Product service credentials are environment-scoped, rotatable, revocable,
  least-privilege, and stored in a secret manager.
- Token issuance fails closed when identity, subscription, entitlement,
  provisioning, or registry state cannot be confirmed.
- Health checks cannot target arbitrary Internet or link-local addresses.
- Lifecycle delivery is idempotent and replay-safe.
- Tenant/product deletion is asynchronous, auditable, confirmation-based, and
  never performed simply because a subscription is suspended.
- Manifest rollback activates a previous compatible immutable revision; stored
  history is never overwritten.
- Registry database changes, lifecycle events, token decisions, and overrides
  carry request/correlation IDs.

## 9. Required automated test matrix

### Contract/SDK

- schema-v2 valid and invalid manifests;
- unknown product keys and audiences;
- immutable identifier compatibility;
- additive and breaking revision detection;
- canonical hash/signature verification;
- package build, typecheck, tests, compatibility check, and artifact import.

### Platform API

- registration authorization, MFA, idempotency, conflicts, and audit;
- generic token issuance for at least HRMS and ECHO;
- cross-product audience/credential rejection;
- subscription, override, limit, suspension, and entitlement-version behavior;
- navigation and provisioning for multiple products;
- lifecycle retry, dead letter, replay, and acknowledgement;
- health target allowlisting and timeout behavior.

### HRMS regression

- tenant admin, HR staff, manager, employee, and field employee roles;
- employees, organization, attendance, leave, payroll, documents, devices,
  biometrics, regularization, reports, and field tracking;
- web product launch and deep links;
- mobile login, refresh, product-token exchange, offline queue, background
  tracking, notifications, and logout;
- tenant suspension, user disablement, entitlement removal, and stale token.

### End-to-end zero-code proof

- fresh Platform databases plus separate HRMS and ECHO databases;
- one gateway hostname and tenant subdomain;
- registration -> plan -> subscription -> provisioning -> navigation -> token ->
  product API -> usage -> suspension/reactivation/deletion;
- automated assertion that generic Platform services and shared SDK contain no
  ECHO-specific source changes.

## 10. Migration and rollback rules

- All database changes are additive until generic behavior has passed
  reconciliation and observation.
- Existing `Module`, plan-module, and tenant-module records remain readable
  during migration but become read-only compatibility data.
- Migration is idempotent, restartable, tenant-scoped, and recorded in a ledger.
- Produce before/after counts and entitlement snapshots for every tenant.
- Do not delete legacy records during the initial cutover.
- Rollback switches reads and token issuance to the previous resolver and
  reactivates the previous compatible manifest revision.
- Product data is never rolled back by querying or modifying a product database
  from Platform.
- Cleanup occurs only after the documented rollback/observation window closes.

## 11. Definition of done

This corrective plan is complete only when all statements below are true:

- [x] The contract SDK has no closed list of product keys, audiences,
  capabilities, permissions, or limits.
- [ ] Platform has a validated, revisioned, auditable product registry.
- [ ] Token issuance, navigation, entitlements, provisioning, lifecycle, health,
  and usage are generic.
- [ ] Plans are product/capability/add-on/limit based and cannot be bypassed by
  legacy module switches.
- [ ] HRMS is registered and operated through the generic path.
- [ ] HRMS web, API, worker, gateway, and mobile flows pass regression tests.
- [ ] The Product Catalog UI shows correct product taxonomy and derived tenant
  entitlements.
- [ ] The ECHO reference product passes the complete zero-code onboarding test.
- [ ] Adding ECHO caused no Platform or shared-contract product-specific source
  change and no Platform application redeployment.
- [ ] The onboarding standard, deployment guide, starter template, CI, and
  runbooks describe the same process.
- [ ] Mail and POS can begin integration by supplying manifests and product
  implementations, without requesting new Platform authorization branches.

## 12. Immediate implementation order

Work must proceed in this dependency order:

1. Phase 0 safety tests and regression fixtures.
2. Phase 1 generic contract/SDK release and version alignment.
3. Phase 2 registry schema and migration.
4. Phase 3 secure registration service and CLI/CI workflow.
5. Phases 4-6 generic token, entitlement, lifecycle, health, and navigation.
6. Phase 7 Product Catalog UI correction.
7. Phase 8 HRMS data and runtime migration.
8. Phase 9 ECHO zero-code proof.
9. Phase 10 compatibility removal and documentation correction.

Mail or POS integration must not start by adding another hardcoded Platform
branch. It starts only after the ECHO exit gate proves the dynamic foundation.
