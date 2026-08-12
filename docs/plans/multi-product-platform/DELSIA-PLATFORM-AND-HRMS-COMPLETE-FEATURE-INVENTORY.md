# Delsia Platform and HRMS Complete Feature Inventory

**Prepared:** 2026-08-11
**Purpose:** Feature-only master inventory for conversion to CSV/XLSX and for future implementation tracking.
**Scope:** Delsia Platform, gateway, shared product contract, DeltCRM HRMS API/web/mobile, attendance, field tracking, face verification, payroll, notifications, migration, operations, and reusable integration for future products such as Mail and POS.
**Excluded:** Timelines, effort estimates, team size, and manpower planning.

## How to read this inventory

This file consolidates the existing plans and the current implementation audit. It deliberately separates a feature being present in code from a feature being production-complete.

| Status | Meaning |
|---|---|
| Implemented foundation | A meaningful implementation exists, but production verification may still be required. |
| Partial | Some API, data, UI, or test pieces exist, but the complete vertical flow is incomplete. |
| Missing | The required implementation was not found at the separated Platform/HRMS boundary. |
| Validation pending | The feature may exist, but real-stack, security, migration, or production evidence is missing. |
| Conflicting | Multiple models or legacy implementations exist and must be normalized. |
| Decision required | The business/product/security rule must be approved before implementation is finalized. |
| Future candidate | Useful capability identified by the audit but not yet confirmed as committed scope. |

The `Boundary` column identifies the system that should own the feature. `Shared` means the contract defines the vocabulary while Platform and product services implement their respective responsibilities.

## A. Product architecture and governance

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| GOV-001 | Product model | HRMS represented as one commercial product | Conflicting | Platform | Remove Attendance, Leave, Payroll, and other HRMS capabilities as independent products and retain one HRMS product. |
| GOV-002 | Product model | HRMS capabilities represented within the HRMS product | Partial | Shared | Define canonical capability keys for every separately sellable or controllable HRMS feature. |
| GOV-003 | Ownership | Platform versus HRMS responsibility matrix | Partial | Shared | Approve ownership for identity, billing, employee data, authorization, files, notifications, mobile, and operations. |
| GOV-004 | Ownership | Canonical HRMS mobile application ownership | Missing | HRMS | Keep `deltcrm-hrms/apps/mobile`, freeze and later remove the duplicate Platform mobile copy. |
| GOV-005 | Architecture | Architecture decision records | Missing | Shared | Record commercial boundary, authentication, authorization, capacity, biometric, field privacy, payroll, and migration decisions. |
| GOV-006 | Delivery governance | One evidence-backed implementation tracker | Partial | Shared | Replace contradictory completion claims with status tied to code and acceptance evidence. |
| GOV-007 | Delivery governance | Feature-to-test traceability | Missing | Shared | Map every inventory row to unit, integration, contract, E2E, security, and operations evidence as applicable. |
| GOV-008 | Release governance | Release approval and rollback policy | Missing | Shared | Define severity, release gates, rollback authority, and acceptance ownership. |
| GOV-009 | Product analytics | Product success event taxonomy | Missing | Platform | Define signup, activation, product launch, attendance, payroll, upgrade, downgrade, renewal, and churn events. |
| GOV-010 | Product analytics | Privacy-safe analytics implementation | Missing | Shared | Collect product analytics without leaking sensitive HR, biometric, location, or payroll data. |

## B. Shared product contract and SDK

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| CON-001 | Registry | Canonical product keys | Partial | Shared contract | Version HRMS, Mail, POS, and future product identifiers. |
| CON-002 | Registry | Canonical HRMS capability keys | Partial | Shared contract | Include core, directory, documents, attendance, leave, shifts, geofence, devices, biometrics, regularization, reports, field, payroll, and exports. |
| CON-003 | Authorization | Canonical permission keys | Partial | Shared contract | Use stable product-scoped permissions with backward-compatible aliases during migration. |
| CON-004 | Subscription | Subscription access-state vocabulary | Partial | Shared contract | Define trial, active, grace/past-due, suspended, canceled, expired, and no-subscription behavior. |
| CON-005 | Entitlements | Effective-entitlement response | Partial | Shared contract | Define product access, capabilities, limits, overrides, subscription state, and entitlement version. |
| CON-006 | Limits | Typed commercial limits | Missing | Shared contract | Define employee capacity and future numeric/boolean/quantity limits without raw untyped JSON. |
| CON-007 | Errors | Stable authorization and limit error codes | Partial | Shared contract | Standardize product-not-entitled, capability-not-entitled, stale-entitlement, inactive-subscription, and limit-exceeded errors. |
| CON-008 | Tokens | Product-token claim contract | Partial | Shared contract | Define issuer, audience, subject, tenant, membership, roles, permissions, capabilities, limits, version, expiry, and token ID. |
| CON-009 | Events | Product lifecycle event envelopes | Partial | Shared contract | Version provision, suspend, reactivate, delete, subscription, entitlement, and tenant-setting events. |
| CON-010 | Usage | Usage event envelope | Missing | Shared contract | Define metric key, tenant, value, period, occurrence time, entitlement version, and idempotency ID. |
| CON-011 | Manifests | Versioned product-manifest schema | Partial | Shared contract | Define routes, API prefix, audience, health URL, locales, capabilities, permissions, lifecycle events, limits, and UI metadata. |
| CON-012 | Compatibility | Current-to-previous compatibility tests | Missing | Shared contract | Test producers and consumers against current and previous supported contract versions. |
| CON-013 | Compatibility | Breaking-change gate | Missing | Shared contract | Block incompatible claims, APIs, event schemas, manifest fields, and renamed capability keys. |
| CON-014 | Distribution | Versioned private package publishing | Implemented foundation | Shared contract | Publish immutable versions with changelog, provenance, and supported compatibility range. |
| CON-015 | Distribution | Simple authenticated package installation | Partial | Shared contract | Document one-time registry/token setup and single-command npm/pnpm installation. |
| CON-016 | Distribution | CI and deployment package authentication | Partial | Shared | Configure scoped registry and least-privilege package token in every consumer pipeline. |
| CON-017 | SDK | Generated TypeScript client | Missing | Shared contract | Generate and publish typed Platform/product API clients from approved specifications. |
| CON-018 | SDK | Generated Dart client | Missing | Shared contract | Generate typed mobile contracts and API clients for the HRMS Flutter application. |
| CON-019 | Deprecation | Contract deprecation policy | Missing | Shared contract | Publish aliases, warnings, removal dates, and migration instructions. |
| CON-020 | Provenance | Signed release metadata | Missing | Shared contract | Record source commit, build identity, checksums, package version, and release notes. |

## C. Platform identity and workspace access

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| IAM-001 | Signup | Workspace/company signup | Implemented foundation | Platform | Validate complete signup, tenant creation, owner membership, verification, and initial product-selection flow. |
| IAM-002 | Login | Workspace login | Implemented foundation | Platform | Provide tenant-aware login, controlled company switching, safe next URL, and clear error handling. |
| IAM-003 | Login | Platform operator login | Partial | Platform | Keep operator administration separate from tenant workspace login and enforce operator roles/MFA. |
| IAM-004 | Verification | Email verification | Partial | Platform | Verify token expiry, resend throttling, single use, audit, and localized templates. |
| IAM-005 | Recovery | Forgot/reset password | Partial | Platform | Add token rotation, expiry, session revocation, abuse protection, and complete UI tests. |
| IAM-006 | Sessions | Access and rotating refresh tokens | Partial | Platform | Enforce rotation, replay detection, secure cookies/storage, expiry, and device/session visibility. |
| IAM-007 | Sessions | Session management | Partial | Platform | Let users view and revoke sessions; let admins revoke compromised or terminated-user sessions. |
| IAM-008 | Security | Multi-factor authentication | Partial | Platform | Complete enrollment, recovery codes, step-up MFA, reset, audit, and operator requirements. |
| IAM-009 | Invitations | Workspace user invitation | Partial | Platform | Support invite, resend, expiry, accept, duplicate handling, role assignment, and revocation. |
| IAM-010 | Membership | Multi-workspace membership | Partial | Platform | Switch tenant context safely without cross-tenant tokens, caches, or data leakage. |
| IAM-011 | Account | User profile and preferences | Partial | Platform | Manage identity attributes, locale, timezone, security preferences, and notification preferences. |
| IAM-012 | Status | User suspension/deactivation | Partial | Platform | Revoke product access, sessions, jobs, and tokens consistently. |
| IAM-013 | SSO | Browser Platform-to-product SSO | Partial | Shared | Open HRMS through gateway without a second login and without exposing tokens in URLs. |
| IAM-014 | Product token | Short-lived product-token exchange | Partial | Platform | Issue audience-scoped, tenant-scoped HRMS tokens with effective authorization context. |
| IAM-015 | Revocation | Entitlement and identity revocation | Missing | Shared | Propagate removals to new requests and active sessions within an approved target. |
| IAM-016 | Keys | Signing-key rotation | Missing | Platform | Support current/previous overlap, key IDs, emergency revocation, clock skew, and rotation drills. |
| IAM-017 | Security | Login abuse controls | Partial | Platform | Add rate limiting, lockout/risk controls, suspicious-login notification, and audit evidence. |
| IAM-018 | Enterprise | SAML/OIDC enterprise SSO | Future candidate | Platform | Add only after commercial scope and tenant-domain behavior are approved. |
| IAM-019 | Enterprise | SCIM provisioning | Future candidate | Platform | Provision/deprovision workspace identities and group mappings for enterprise tenants. |
| IAM-020 | Compliance | Authentication audit trail | Partial | Platform | Record signup, login, failure, MFA, recovery, session, role, and token events without secrets. |

## D. Platform tenant and administration

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| TEN-001 | Tenant | Company/workspace profile | Partial | Platform | Manage legal/display name, addresses, identifiers, contacts, branding, and status. |
| TEN-002 | Regional | Locale configuration | Partial | Platform | Define supported languages, default locale, fallback, and product propagation. |
| TEN-003 | Regional | Timezone configuration | Partial | Platform | Use tenant timezone consistently in tokens, products, reports, billing, and notifications. |
| TEN-004 | Regional | Currency configuration | Partial | Platform | Define display/billing currency and prevent product-specific conflicting sources. |
| TEN-005 | Branding | Theme and brand settings | Partial | Platform | Propagate logo, colors, light/dark themes, and accessible contrast to products. |
| TEN-006 | Domains | Custom domain management | Partial | Platform | Support validation, TLS, tenant resolution, rollback, and safe product routing. |
| TEN-007 | Admin | Tenant administrator management | Partial | Platform | Add/remove admins, protect last owner, require step-up authentication, and audit changes. |
| TEN-008 | Roles | Tenant-defined roles | Partial | Shared | Tenant admin defines HRMS roles only within purchased capabilities. |
| TEN-009 | Roles | Role assignment | Partial | Shared | Assign roles to users/members with effective dates, revocation, scope, and audit. |
| TEN-010 | Permissions | Permission catalog UI | Partial | Platform | Present product-grouped permissions in understandable language and hide irrelevant capability areas. |
| TEN-011 | Permissions | Resource/reporting scope | Partial | HRMS | Enforce self, direct-report, department, office, custom group, and tenant-wide scopes. |
| TEN-012 | Audit | Central tenant audit view | Partial | Platform | Search/export identity, role, billing, product, entitlement, and administrative events. |
| TEN-013 | Support | Support impersonation/access | Decision required | Platform | If allowed, require consent/approval, time limits, visible banners, reason, and immutable audit. |
| TEN-014 | Data rights | Tenant data export | Missing | Shared | Coordinate Platform identity/billing export with product-owned business data exports. |
| TEN-015 | Lifecycle | Tenant suspension/reactivation | Partial | Platform | Propagate access state to gateway, token issuance, products, jobs, and notifications. |
| TEN-016 | Lifecycle | Tenant deletion | Missing | Shared | Implement approval, delay, export, product cleanup, retention, irreversible deletion, and audit. |

## E. Generic multi-product control plane

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| PLT-001 | Registry | Data-driven product registry | Partial | Platform | Remove HRMS-only conditionals and load every product from a validated manifest/catalog. |
| PLT-002 | Registry | Product version administration | Missing | Platform | Track active/supported versions, compatibility, deployment health, and upgrade requirements. |
| PLT-003 | Registry | Product health administration | Missing | Platform | Display readiness, dependency health, last check, outage, and maintenance state. |
| PLT-004 | Provisioning | Generic product provisioning | Partial | Shared | Create product tenant state idempotently after entitlement activation. |
| PLT-005 | Provisioning | Provisioning retry and recovery | Partial | Shared | Retry safely, expose failure, support replay, and avoid duplicate tenant/product state. |
| PLT-006 | Lifecycle | Product suspension | Partial | Shared | Stop new access while preserving approved read/export and recovery behavior. |
| PLT-007 | Lifecycle | Product reactivation | Partial | Shared | Restore access idempotently and reconcile entitlements/configuration. |
| PLT-008 | Lifecycle | Product uninstall/deletion | Missing | Shared | Define retention/export/grace period and execute product-owned deletion safely. |
| PLT-009 | Navigation | Generic product cards | Partial | Platform | Render available products from entitlements and manifest UI metadata. |
| PLT-010 | Navigation | Generic product launcher | Partial | Platform | Build locale-aware safe product URLs and controlled unavailable/provisioning states. |
| PLT-011 | Navigation | Deep-link preservation | Partial | Shared | Preserve locale, tenant, and requested product route through login and token exchange. |
| PLT-012 | Access | Effective-entitlement resolver | Partial | Platform | Resolve subscription, plan, add-ons, overrides, status, capabilities, and limits consistently. |
| PLT-013 | Access | Entitlement cache/versioning | Partial | Platform | Increment versions and invalidate product/session/navigation caches on every relevant change. |
| PLT-014 | Usage | Generic usage ingestion | Missing | Platform | Accept signed/idempotent product usage events without querying product databases. |
| PLT-015 | Usage | Usage reconciliation | Missing | Shared | Compare event-derived usage with product snapshot endpoints and explain differences. |
| PLT-016 | Events | Durable Platform outbox | Partial | Platform | Complete retry, backoff, ordering rules, dead-letter visibility, replay, and metrics. |
| PLT-017 | Events | Idempotent product consumers | Partial | Products | Store receipts and make lifecycle/configuration/entitlement consumers replay safe. |
| PLT-018 | Developers | Product developer credentials | Missing | Platform | Issue scoped service credentials with rotation, expiry, revocation, and audit. |
| PLT-019 | Developers | Sandbox tenants | Missing | Platform | Allow product teams to integrate and test without production customer data. |
| PLT-020 | Developers | Webhook/event subscriptions | Missing | Platform | Register destinations/topics with signing, retry, replay, filtering, and delivery visibility. |
| PLT-021 | Developers | Product onboarding CLI/template | Missing | Shared | Generate manifest, token validation, lifecycle handlers, health endpoints, and test scaffolding. |
| PLT-022 | Developers | Product conformance suite | Missing | Shared | Verify contract, auth, isolation, entitlements, lifecycle, routing, localization, and recovery. |
| PLT-023 | Marketplace | Product discovery/catalog | Future candidate | Platform | Show products, descriptions, availability, pricing, trials, and compatibility. |
| PLT-024 | Marketplace | Trial activation | Future candidate | Platform | Provision time-limited access with conversion, expiry, usage, and cleanup rules. |
| PLT-025 | Availability | Maintenance mode | Partial | Shared | Show controlled maintenance state and block unsafe operations without generic gateway errors. |
| PLT-026 | Availability | Product outage state | Partial | Platform | Display product-specific outage while keeping Platform and other products usable. |

## F. Plans, pricing, subscription, and billing

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| BIL-001 | Catalog | HRMS feature editions | Missing | Platform | Define Silver/Gold/Platinum or approved equivalents as capability bundles. |
| BIL-002 | Catalog | Employee capacity tiers | Missing | Platform | Define independent 50, 100, 200, and custom capacity SKUs. |
| BIL-003 | Catalog | Add-on catalog | Partial | Platform | Model optional field tracking, payroll, advanced reports, or approved add-ons. |
| BIL-004 | Pricing | Flat-tier pricing | Partial | Platform | Store recurring price by edition/capacity/period with effective dates and currency. |
| BIL-005 | Pricing | Per-seat pricing | Future candidate | Platform | Support only through an explicit pricing model and purchased-seat quantity. |
| BIL-006 | Pricing | Base-plus-seat pricing | Future candidate | Platform | Separate base fee, included capacity, extra-seat rate, and billing usage. |
| BIL-007 | Pricing | Custom/contract pricing | Partial | Platform | Require approval, effective period, currency, notes, and audit. |
| BIL-008 | Catalog | Capability dependencies/conflicts | Partial | Platform | Validate required parent capabilities, unavailable features, conflicts, and cycles. |
| BIL-009 | Catalog | Plan versioning | Partial | Platform | Prevent silent mutation of active subscriptions and preserve historical invoices/access. |
| BIL-010 | Catalog | Plan publish/archive workflow | Partial | Platform | Support draft, review, publish, retire, and migration impact preview. |
| BIL-011 | Subscriptions | Subscribe tenant to product plan | Partial | Platform | Activate approved edition, capacity, billing interval, currency, dates, and product provisioning. |
| BIL-012 | Subscriptions | Add-on purchase/removal | Partial | Platform | Resolve effective access and propagate changes without altering unrelated roles. |
| BIL-013 | Subscriptions | Upgrade flow | Partial | Platform | Preview price/access changes, apply effective date/proration, and increase limits safely. |
| BIL-014 | Subscriptions | Downgrade flow | Partial | Platform | Block downgrade below usage and explain required remediation. |
| BIL-015 | Subscriptions | Cancellation | Partial | Platform | Define immediate/end-of-period behavior, exports, retention, reactivation, and invoices. |
| BIL-016 | Subscriptions | Trial and conversion | Partial | Platform | Define limits, expiry, reminders, conversion, and post-trial access. |
| BIL-017 | Subscriptions | Past-due grace and suspension | Decision required | Platform | Approve grace periods and read/write behavior for each subscription state. |
| BIL-018 | Overrides | Temporary entitlement override | Partial | Platform | Require reason, approver, start, expiry, scope, visibility, and audit. |
| BIL-019 | Limits | Billable employee definition | Decision required | Shared | Approve which active, invited, onboarding, future, suspended, archived, and terminated statuses count. |
| BIL-020 | Limits | Atomic employee-capacity enforcement | Missing | HRMS | Lock/reserve tenant capacity for create, import, reactivation, and billable status transitions. |
| BIL-021 | Limits | Bulk-import capacity reservation | Missing | HRMS | Reserve capacity for accepted batch and return consistent row/all-or-nothing errors. |
| BIL-022 | Usage | Employee usage reporting | Missing | Shared | Emit idempotent usage changes and reconcile Platform snapshots. |
| BIL-023 | Usage | Near-limit warnings | Missing | Shared | Notify billing/HR admins at approved thresholds and show upgrade action. |
| BIL-024 | Billing | Invoice generation/history | Partial | Platform | Produce immutable invoice lines, numbering, tax data, PDFs, status, and download history. |
| BIL-025 | Billing | Payment provider integration | Partial | Platform | Harden customer/payment/subscription synchronization and provider abstraction. |
| BIL-026 | Billing | Payment webhooks | Partial | Platform | Verify signatures, deduplicate, order safely, retry, reconcile, and audit. |
| BIL-027 | Billing | Dunning and failed-payment recovery | Missing | Platform | Send reminders, retry payment, apply grace policy, and control suspension/reactivation. |
| BIL-028 | Billing | Refunds and credits | Missing | Platform | Support approvals, credit notes, provider reconciliation, and immutable audit. |
| BIL-029 | Billing | Tax handling | Partial | Platform | Validate tax identifiers, rates, exemptions, place-of-supply, and invoice presentation by market. |
| BIL-030 | Billing | Billing portal | Partial | Platform | Show current plan, usage, invoices, payment method, upgrades, downgrades, and cancellation controls. |
| BIL-031 | Administration | Plan builder | Partial | Platform | Manage basics, features, capacity, add-ons, dependencies, prices, review, and publish. |
| BIL-032 | Administration | Tenant entitlement inspector | Partial | Platform | Explain inherited grants, add-ons, overrides, limits, source, and effective version. |
| BIL-033 | Enforcement | Direct API capability denial | Missing | HRMS | Deny excluded capabilities regardless of hidden navigation or user role. |
| BIL-034 | Enforcement | Active-session entitlement invalidation | Missing | Shared | Remove access after plan/add-on/override/status change within approved propagation target. |
| BIL-035 | Migration | Legacy plans and entitlements migration | Missing | Platform | Dry-run old-to-new access, grandfather deliberate exceptions, and require review of every difference. |

## G. Platform notifications and communications

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| NTF-001 | In-app | Notification inbox | Implemented foundation | Platform | Complete pagination, filtering, localization, deep links, retention, and tenant isolation. |
| NTF-002 | In-app | Unread count | Implemented foundation | Platform | Keep badge count consistent across devices, sessions, and mark-read operations. |
| NTF-003 | In-app | Mark one/all read | Implemented foundation | Platform | Make operations idempotent and correctly tenant/user scoped. |
| NTF-004 | Preferences | Per-channel preferences | Partial | Platform | Support event/category/channel preferences while preserving mandatory security notices. |
| NTF-005 | Preferences | Quiet hours and timezone | Missing | Platform | Delay eligible notifications according to user timezone without delaying mandatory events. |
| NTF-006 | Preferences | Digest delivery | Future candidate | Platform | Support daily/weekly summaries for eligible low-priority events. |
| NTF-007 | Templates | Versioned notification templates | Partial | Platform | Manage event, locale, channel, variables, fallback, preview, publish, and rollback. |
| NTF-008 | Localization | Localized notification rendering | Partial | Platform | Validate English/Arabic output, RTL text, fallback, dates, numbers, and links. |
| NTF-009 | Email | SMTP/email-gateway delivery | Implemented foundation | Platform | Configure production provider, sender identity, TLS, rate limits, and delivery monitoring. |
| NTF-010 | Email | Email bounce/complaint handling | Missing | Platform | Process provider feedback, suppress invalid addresses, alert admins, and audit. |
| NTF-011 | Email | Unsubscribe/preferences links | Partial | Platform | Use signed links and enforce mandatory versus optional categories correctly. |
| NTF-012 | Push | FCM push delivery | Partial | Platform | Replace development fallback with validated provider credentials and production delivery evidence. |
| NTF-013 | Push | APNs/iOS delivery | Missing | Platform | Configure APNs through approved provider, validate environments, and support iOS behavior. |
| NTF-014 | Push | Device-token registration | Missing | Shared | Register token with user, tenant, app, platform, device, locale, and last-seen metadata. |
| NTF-015 | Push | Device-token refresh/rotation | Missing | Shared | Replace tokens atomically and prevent stale token fan-out. |
| NTF-016 | Push | Device-token invalidation | Missing | Shared | Remove provider-rejected tokens and tokens from logout, user suspension, or device removal. |
| NTF-017 | Push | Multi-device targeting | Missing | Platform | Deliver to approved active devices while deduplicating user-level events. |
| NTF-018 | Push | Deep-link routing | Partial | Shared | Validate product/tenant/locale routes and prevent unsafe external or cross-tenant links. |
| NTF-019 | Delivery | Retry and exponential backoff | Partial | Platform | Execute persisted retry metadata through workers with bounded attempts. |
| NTF-020 | Delivery | Dead-letter queue and replay | Missing | Platform | Expose failed deliveries, reason, payload-safe inspection, replay, and audit. |
| NTF-021 | Delivery | Idempotent notification deduplication | Partial | Platform | Prevent repeated event delivery across worker retries and event replay. |
| NTF-022 | Delivery | Rate limiting and bulk protection | Missing | Platform | Limit tenant/provider/user bursts and support safe bulk campaigns/system events. |
| NTF-023 | Analytics | Delivery analytics | Missing | Platform | Track accepted, delivered, opened/read where available, bounced, failed, and suppressed. |
| NTF-024 | Operations | Notification monitoring and alerts | Missing | Platform | Monitor queue lag, failure rate, provider outage, bounce rate, and token invalidation. |
| NTF-025 | Security | Mandatory security notifications | Partial | Platform | Cover password, MFA, new session, role, product access, billing, and suspicious activity events. |
| NTF-026 | HRMS | HRMS business notifications | Partial | Shared | Cover invitations, attendance exceptions, leave decisions, device actions, payroll completion, and payslip release. |
| NTF-027 | Communications | SMS channel | Future candidate | Platform | Add only after provider, consent, countries, costs, templates, and opt-out rules are approved. |
| NTF-028 | Communications | WhatsApp channel | Future candidate | Platform | Add only after provider/template/compliance and tenant opt-in decisions. |

## H. HRMS organization and employee management

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| HRM-001 | Onboarding | Guided HRMS tenant setup | Partial | HRMS | Guide organization, offices, departments, designations, policies, shifts, admins, and readiness. |
| HRM-002 | Organization | Organization profile | Partial | HRMS | Store HR-operational settings without duplicating Platform-owned identity/billing fields. |
| HRM-003 | Organization | Departments | Implemented foundation | HRMS | Complete hierarchy, manager, effective dates, delete constraints, imports, and audit. |
| HRM-004 | Organization | Designations/job titles | Implemented foundation | HRMS | Complete levels, effective dates, uniqueness, assignments, and audit. |
| HRM-005 | Organization | Offices/work locations | Implemented foundation | HRMS | Complete address, timezone, geofence, active status, assignments, and history. |
| HRM-006 | Organization | Reporting hierarchy | Partial | HRMS | Enforce manager relationships, cycles, effective dates, and reporting-scope authorization. |
| HRM-007 | Employees | Employee directory | Implemented foundation | HRMS | Complete search, filters, sort, pagination, export, scope, and stable empty/error states. |
| HRM-008 | Employees | Employee creation | Partial | HRMS | Validate identifiers, capacity, assignments, access provisioning, audit, and notifications. |
| HRM-009 | Employees | Employee profile | Partial | HRMS | Complete overview, contact, employment, assignments, attendance, leave, access, devices, documents, and history tabs. |
| HRM-010 | Employees | Employee update/effective dating | Partial | HRMS | Preserve history and apply changes to correct future/current periods. |
| HRM-011 | Employees | Employee status lifecycle | Partial | HRMS | Support invited, onboarding, active, suspended, terminated, archived, and reactivated rules. |
| HRM-012 | Employees | Termination/offboarding | Partial | HRMS | Handle effective date, access revocation, final attendance/payroll, assets/documents, and retention. |
| HRM-013 | Employees | Reactivation/rehire | Partial | HRMS | Recheck capacity, identity linkage, assignments, policies, history, and access. |
| HRM-014 | Employees | Bulk employee import | Partial | HRMS | Add template, validation, preview, mapping, idempotency, capacity reservation, partial failure rule, and audit. |
| HRM-015 | Employees | Employee export | Partial | HRMS | Enforce field-level authorization, scope, locale, audit, and large-export jobs. |
| HRM-016 | Employees | Custom employee fields | Future candidate | HRMS | Define data types, validation, visibility, indexing, reporting, import/export, and privacy. |
| HRM-017 | Employees | Employee groups/tags | Future candidate | HRMS | Support dynamic/static groups for policy, reporting, permissions, and communications. |
| HRM-018 | Access | Employee-user account linking | Partial | Shared | Link Platform identity to HRMS employee without duplicating passwords or authentication. |
| HRM-019 | Access | Employee invitation/access provisioning | Partial | Shared | Provision membership, HRMS role, employee link, notification, and recovery idempotently. |
| HRM-020 | Documents | Employee document upload | Partial | HRMS | Use presigned upload, type/size validation, malware scan, metadata, and authorization. |
| HRM-021 | Documents | Employee document view/download | Partial | HRMS | Enforce tenant, employee, role, purpose, signed expiry, and audit. |
| HRM-022 | Documents | Document expiry/reminders | Missing | HRMS | Track expiry, notify employee/admin, and report missing/expired documents. |
| HRM-023 | Documents | Document retention/deletion | Missing | HRMS | Apply legal/tenant policy, hold, employee exit, export, and verified deletion. |
| HRM-024 | History | Employee audit/history timeline | Partial | HRMS | Restore separated history API, filtering, pagination, actor attribution, and human-readable changes. |
| HRM-025 | Workflows | Configurable HR approval workflows | Future candidate | HRMS | Reuse workflow definitions for employee changes, leave, correction, payroll, and documents. |

## I. HRMS authorization and commercial enforcement

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| AUT-001 | Validation | Product-token validation | Partial | HRMS | Verify issuer, audience, signature, expiry, token ID, tenant, membership, and entitlement version. |
| AUT-002 | Validation | Platform identity/current-access validation | Partial | Shared | Fail closed for suspended tenant/user/product and support bounded outage behavior. |
| AUT-003 | Capabilities | Server-side capability guard | Missing | HRMS | Classify and guard every controller route; unclassified routes fail release. |
| AUT-004 | Permissions | Server-side permission guard | Implemented foundation | HRMS | Use canonical keys and apply consistently to API, jobs, exports, files, and events. |
| AUT-005 | Scope | Resource/reporting scope enforcement | Partial | HRMS | Apply self/report/team/department/office/custom/tenant scope to queries and object access. |
| AUT-006 | Settings | Entitlement ceiling over tenant settings | Partial | HRMS | Tenant configuration may narrow but never enable an unpurchased capability. |
| AUT-007 | Roles | Tenant-admin role builder | Partial | Shared | Let HRMS admin decide team access within effective entitlements. |
| AUT-008 | Roles | Prevent over-granting | Missing | Shared | Reject role grants belonging to excluded capabilities and explain why. |
| AUT-009 | UI | Entitlement-driven HRMS navigation | Partial | HRMS | Hide/label unavailable features and show upgrade action only to billing-authorized admins. |
| AUT-010 | UI | Direct URL/API denial | Missing | HRMS | Preserve server enforcement even if users navigate directly or forge requests. |
| AUT-011 | Audit | Authorization-denial audit | Partial | Shared | Record privileged denials without flooding logs or exposing sensitive claims. |
| AUT-012 | Resilience | Stale-entitlement handling | Missing | Shared | Refresh or deny high-risk/limit-changing writes; never trust stale UI state. |

## J. Attendance core and scheduling

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| ATT-001 | Punch | Employee check-in | Partial | HRMS | Support idempotency, policy, schedule, timezone, location/device/face rules, and audit. |
| ATT-002 | Punch | Employee check-out | Partial | HRMS | Calculate day/session safely and handle duplicate, late, offline, overnight, and missing-check-in cases. |
| ATT-003 | Punch | Break start/end | Partial | HRMS | Enforce sequence, policy, multiple breaks, offline replay, and payable-time calculation. |
| ATT-004 | Punch | Offline punch sync | Partial | HRMS | Use client operation IDs, server receipts, ordering, dedupe, expiry, and conflict resolution. |
| ATT-005 | Punch | Attendance evidence upload | Partial | HRMS | Presign/upload metadata securely and bind evidence to operation, employee, tenant, and decision. |
| ATT-006 | Today | Employee current-day status | Partial | HRMS | Return authoritative state, next allowed action, schedule, totals, exceptions, and sync receipts. |
| ATT-007 | History | Employee attendance history/day detail | Partial | HRMS | Complete separated self APIs, calendar, timeline, evidence visibility, and scope. |
| ATT-008 | Admin | Attendance overview dashboard | Partial | HRMS | Stabilize priorities, metrics, filters, refresh, empty/error state, and date behavior. |
| ATT-009 | Admin | Daily attendance register | Partial | HRMS | Support employee/status/department/office filters, pagination, drill-down, and export. |
| ATT-010 | Admin | Monthly attendance view | Partial | HRMS | Handle shift schedules, holidays, leave, corrections, overnight time, and totals. |
| ATT-011 | Admin | Employee-day detail | Partial | HRMS | Load event timeline, decisions, evidence, changes, and return navigation without legacy routes. |
| ATT-012 | Policies | Attendance policies | Implemented foundation | HRMS | Complete versioning, effective dates, validation, assignments, precedence, and audit. |
| ATT-013 | Policies | Policy assignment | Partial | HRMS | Assign by employee/group/office with deterministic precedence and future changes. |
| ATT-014 | Scheduling | Shift definitions | Implemented foundation | HRMS | Support timing, overnight, grace, breaks, weekly off, effective dates, and validation. |
| ATT-015 | Scheduling | Rosters | Partial | HRMS | Create/publish/change schedules, resolve conflicts, notify employees, and preserve history. |
| ATT-016 | Scheduling | Holiday calendars | Partial | HRMS | Manage regional/office calendars, optional holidays, effective dates, and attendance/payroll effects. |
| ATT-017 | Calculation | Worked-time engine | Partial | HRMS | Validate rounding, grace, breaks, overtime, overnight, DST/timezone, leave, and corrections. |
| ATT-018 | Exceptions | Late/early/overtime/absence detection | Partial | HRMS | Produce explainable exceptions with policy version and approval consequences. |
| ATT-019 | Corrections | Attendance regularization request | Partial | HRMS | Submit/cancel with reason/evidence, validation, entitlement, permission, and notification. |
| ATT-020 | Corrections | Regularization approval | Partial | HRMS | Approve/reject with scope, conflict handling, recalculation, audit, and notification. |
| ATT-021 | Geofence | Office geofence configuration | Partial | HRMS | Validate coordinates/radius, policy assignment, precision, audit, and entitlement. |
| ATT-022 | Geofence | Geofence punch validation | Partial | HRMS | Evaluate server-side location age/accuracy/distance and store explainable decision evidence. |
| ATT-023 | Devices | Registered-device trust | Partial | HRMS | Enroll, approve, bind, replace, block, revoke, inspect, and notify. |
| ATT-024 | Devices | Device integrity challenge | Missing | HRMS | Issue nonce/challenge, verify attestation where supported, prevent replay, and record risk. |
| ATT-025 | Security | Attendance security events | Partial | HRMS | Record spoof, device, location, face, replay, impossible-state, and admin-change events. |

## K. Leave and absence management

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| LEV-001 | Setup | Leave types | Partial | HRMS | Configure paid/unpaid, unit, eligibility, documents, color, status, and effective dates. |
| LEV-002 | Setup | Leave policies | Partial | HRMS | Define entitlement, accrual, carry-forward, expiry, probation, notice, limits, and overlap rules. |
| LEV-003 | Setup | Policy assignment | Partial | HRMS | Assign by employee/group with deterministic precedence and effective dating. |
| LEV-004 | Balances | Leave balance ledger | Partial | HRMS | Use auditable grants, accruals, adjustments, consumption, reversal, expiry, and opening balances. |
| LEV-005 | Requests | Employee leave request | Partial | HRMS | Complete separated API, balance validation, attachment, half-day/hour unit, delegate, and notification. |
| LEV-006 | Requests | Leave cancellation/withdrawal | Partial | HRMS | Apply approval state rules, balance reversal, attendance recalculation, and audit. |
| LEV-007 | Approval | Manager/admin approval | Partial | HRMS | Enforce reporting scope, multi-step rules if configured, conflicts, comments, and notifications. |
| LEV-008 | Calendar | Team leave calendar | Partial | HRMS | Enforce privacy/scope and display holidays, overlaps, pending, and approved absence. |
| LEV-009 | Integration | Attendance integration | Partial | HRMS | Recalculate absence/day status and protect finalized payroll periods. |
| LEV-010 | Reports | Leave reports and export | Partial | HRMS | Provide balances, usage, liability, policy, trend, and audit-ready exports. |

## L. Field employee attendance management

> Product decision (2026-08-11): Field employee attendance is the active
> advanced-attendance implementation priority. It is an optional Attendance
> add-on, never a mandatory requirement for ordinary attendance. Effective
> access requires all four gates: the Platform-issued
> `HRMS_FIELD_TRACKING` entitlement, the HRMS company-wide administrator
> toggle, an effective attendance policy that enables field tracking, and an
> eligible `FIELD` employee (or an explicitly permitted `HYBRID` employee).
> Failure or removal of any gate must hide the employee controls, reject new
> server operations, and stop active background tracking. Facial attendance is
> deferred and must not block this feature.

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| FLD-001 | Product rules | Field-tracking capability | Implemented | Shared | Canonical Platform entitlement, company toggle, employee policy/work-type eligibility, API enforcement, administrator shutdown, and mobile denial handling are implemented. |
| FLD-002 | Privacy | Employee notice and consent | Implemented | HRMS | Versioned grant/withdrawal consent is persisted, exposed to mobile, audited, and withdrawal stops active tracking. |
| FLD-003 | Privacy | Tracking-hours policy | Implemented | HRMS | Tenant-configured tracking windows are enforced at session start and ping ingestion; sessions close at window end or checkout. |
| FLD-004 | Privacy | Precision and retention policy | Implemented foundation | HRMS | Administrators configure accuracy and retention; ingestion enforces accuracy and scheduled deletion honors legal hold. Formal jurisdiction-specific policy approval remains operational work. |
| FLD-005 | Sessions | Start field session | Implemented | HRMS | Start is idempotent and enforces tenant, entitlement, company toggle, policy/work type, consent, attendance state, tracking window, and active device. |
| FLD-006 | Sessions | Get active field session | Implemented | HRMS | Authoritative restoration enforces ownership and closes sessions that have exceeded their approved tracking window. |
| FLD-007 | Sessions | Stop field session | Implemented | HRMS | Stop is idempotent, supports bounded late replay, records the end reason, and finalizes the route summary. |
| FLD-008 | Location | Foreground location capture | Implemented | HRMS mobile | Captures scoped positions with accuracy, timestamp, idempotency operation ID, disclosure, and authoritative policy handling. |
| FLD-009 | Location | Background location capture | Implemented; device validation pending | HRMS mobile | Android/iOS permissions, worker registration, restart restoration, visible disclosure, and cancellation are implemented; prolonged physical-device reliability must be evidenced before release. |
| FLD-010 | Location | Offline ping queue | Implemented foundation | HRMS mobile | Queue scope, encrypted persistence, ordering, receipts, bounded replay, and authoritative cancellation are implemented. |
| FLD-011 | Ingestion | Batched location-ping API | Implemented | HRMS | Tenant/device/session batching enforces bounds, order, time age, accuracy, window, dedupe, immutable idempotency receipts, and late-replay limits. |
| FLD-012 | Integrity | Mock-location and tamper policy | Implemented foundation | HRMS | Mock and reported-speed signals create risk flags/security alerts without directly changing attendance or payroll. Manual-review policy remains configurable operational work. |
| FLD-013 | Integrity | Impossible travel/speed checks | Implemented | HRMS | Server-side speed and impossible-travel checks flag anomalous movement without silently changing payroll or attendance. |
| FLD-014 | Manager | Live field employee board | Implemented | HRMS web | Tenant- and policy-scoped board shows current/stale/offline state, latest location, last update, and risk flags. |
| FLD-015 | Manager | Route/session detail | Implemented foundation | HRMS web | Route view includes simplified path, stops, gaps, anomalies, attendance events, confidence, and scoped access. A production map provider remains a deployment choice. |
| FLD-016 | Calculation | Distance and route summary | Implemented | HRMS | Persisted summaries calculate distance, duration, stops, gaps, point counts, anomalies, and confidence metadata. |
| FLD-017 | Reports | Field attendance reports | Partial | HRMS | Export session, distance, exceptions, missing tracking, employee/team, and period summaries. |
| FLD-018 | Employee | Location transparency | Implemented foundation | HRMS mobile | Mobile shows tracking state, notice version, collection rules, permission requirements, consent/withdrawal, and policy denial. Employee route-history UX remains optional backlog. |
| FLD-019 | Data | Field retention/deletion jobs | Implemented foundation | HRMS | Scheduled tenant-scoped cleanup deletes raw pings, receipts, summaries, sessions, and expired field-distance exports, audits counts, and honors legal hold. Backup expiry remains infrastructure policy. |
| FLD-020 | Reliability | Battery/network/background tests | Validation pending | HRMS | Automated replay, validation, API, contract, and mobile tests pass; Android/iOS reboot, OS-kill, battery, and prolonged movement evidence on physical devices is still required. |

## M. Face verification attendance management

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| FAC-001 | Product rules | Face-verification capability | Partial | Shared | Add canonical capability, permissions, policy modes, thresholds, and entitlement enforcement. |
| FAC-002 | Governance | Provider/build decision | Decision required | Shared | Evaluate accuracy, liveness, residency, security, cost, SDK support, and contractual terms. |
| FAC-003 | Privacy | Biometric jurisdiction policy | Decision required | Shared | Approve launch regions, lawful basis, employee alternative, consent, retention, and deletion. |
| FAC-004 | Consent | Consent grant/read/withdraw | Missing | HRMS | Store immutable evidence, policy version, timestamps, actor, withdrawal, and consequences. |
| FAC-005 | Enrollment | Enrollment capture challenge | Missing | HRMS | Issue short-lived challenge and approved presigned upload/session. |
| FAC-006 | Enrollment | Enrollment completion | Missing | HRMS | Validate liveness/quality/provider response, bind employee, version template, and audit. |
| FAC-007 | Enrollment | Enrollment status | Partial | HRMS | Return not-enrolled/pending/active/failed/revoked state with safe next action. |
| FAC-008 | Enrollment | Reset/re-enrollment | Partial | HRMS | Restrict admin/self actions, revoke old template, notify, retain required audit, and re-enroll. |
| FAC-009 | Verification | Face capture UX | Partial | HRMS mobile | Provide lighting/pose/quality/liveness guidance, accessibility, retry, and fallback. |
| FAC-010 | Verification | Liveness detection | Missing | Shared | Use evaluated engine/provider and verify signed/server-to-server result. |
| FAC-011 | Verification | Identity matching | Missing | Shared | Apply approved thresholds, quality checks, versioning, and explainable decision metadata. |
| FAC-012 | Punch | Face-verified punch | Partial | HRMS | Make server authoritative; bind challenge, evidence, liveness, match, employee, device, and punch. |
| FAC-013 | Offline | Low-connectivity/offline behavior | Missing | HRMS | Define whether delayed verification is allowed, expiry, risk, fallback, and manual review. |
| FAC-014 | Exceptions | Retry, lockout, and fallback | Partial | HRMS | Avoid denial loops and provide approved alternative attendance method. |
| FAC-015 | Review | Manual exception review | Partial | HRMS web | Scope evidence access, approve/reject/correct, notify, and preserve audit. |
| FAC-016 | Security | Spoof/replay protection | Missing | Shared | Test printed photo, video, screen replay, injection, challenge reuse, and provider callback forgery. |
| FAC-017 | Storage | Biometric template protection | Missing | HRMS | Encrypt/isolate templates, minimize access, rotate keys, redact logs, and prohibit raw reuse. |
| FAC-018 | Storage | Evidence retention/deletion | Missing | HRMS | Apply policy to raw captures, templates, derived data, backups, exports, and withdrawal. |
| FAC-019 | Quality | Accuracy and demographic evaluation | Missing | Shared | Measure false accepts/rejects and quality across intended devices/populations before launch. |
| FAC-020 | Operations | Provider outage and incident handling | Missing | Shared | Define fallback, alerts, retry, degraded mode, audit, and breach response. |

## N. Payroll management

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| PAY-001 | Entitlement | Payroll capability enforcement | Missing | Shared | Require purchased payroll capability separately from user payroll permissions. |
| PAY-002 | Jurisdiction | Country/statutory rule packs | Validation pending | HRMS | Approve supported countries and validate formulas, calendars, rounding, thresholds, and effective dates. |
| PAY-003 | Setup | Pay components | Partial | HRMS | Configure earnings/deductions/employer contributions, taxability, formulas, and effective dates. |
| PAY-004 | Setup | Salary structures | Partial | HRMS | Build reusable structures with validation, versioning, assignment, and audit. |
| PAY-005 | Employees | Compensation assignment | Partial | HRMS | Support effective-dated salary, currency, components, revisions, approvals, and history. |
| PAY-006 | Employees | Payment and statutory details | Partial | HRMS | Protect bank/tax identifiers, validate fields, restrict access, and audit. |
| PAY-007 | Setup | Pay groups and calendars | Partial | HRMS | Configure frequency, periods, cutoffs, payment dates, timezone, and membership. |
| PAY-008 | Inputs | Attendance and leave inputs | Partial | HRMS | Snapshot approved inputs and explain exclusions, overtime, unpaid leave, and corrections. |
| PAY-009 | Inputs | Variable inputs/adjustments | Partial | HRMS | Import/create recurring and one-time items with approval, validation, and dedupe. |
| PAY-010 | Run | Payroll preparation | Partial | HRMS | Select period/population, freeze inputs, identify blockers, and preserve reproducibility. |
| PAY-011 | Run | Payroll calculation | Implemented foundation | HRMS | Validate golden calculations, rounding, concurrency, failures, and immutable inputs. |
| PAY-012 | Run | Validation issues and review | Partial | HRMS | Explain employee-level errors/warnings and block unsafe finalization. |
| PAY-013 | Run | Approval workflow | Partial | HRMS | Enforce separation of duties, permission/scope, comments, audit, and notification. |
| PAY-014 | Run | Finalize and lock | Partial | HRMS | Create immutable snapshots and prevent late attendance/leave mutation. |
| PAY-015 | Run | Reopen/correction/reversal | Partial | HRMS | Require approval, preserve original, calculate differences, and maintain audit. |
| PAY-016 | Outputs | Payslips | Partial | HRMS | Generate localized secure documents, publish/revoke, notify, and enforce employee/admin access. |
| PAY-017 | Outputs | Bank payment files | Partial | HRMS | Generate approved bank formats with control totals, encryption, authorization, and audit. |
| PAY-018 | Outputs | Accounting journals | Partial | HRMS | Map accounts/cost centers, balance totals, export versions, and prevent duplicates. |
| PAY-019 | Outputs | Statutory filings/reports | Partial | HRMS | Generate only approved jurisdiction outputs with version and reconciliation. |
| PAY-020 | Reports | Payroll register and analytics | Partial | HRMS | Provide scoped totals, variance, component, department/cost-center, and audit exports. |
| PAY-021 | Security | Payroll field-level authorization | Partial | HRMS | Restrict salary, bank, tax, payslip, exports, reports, logs, and support access. |
| PAY-022 | Controls | Payroll reconciliation/control totals | Missing | HRMS | Reconcile inputs, gross, deductions, net, employer cost, bank, journal, and statutory totals. |
| PAY-023 | Migration | Payroll history migration parity | Missing | HRMS | Compare historical runs, outputs, snapshots, totals, files, and representative calculations. |
| PAY-024 | Operations | Payroll incident recovery | Missing | HRMS | Document failed run, duplicate output, incorrect finalization, provider/file, restore, and correction procedures. |

## O. HRMS reporting and exports

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| RPT-001 | Reports | Employee reports | Partial | HRMS | Add scoped directory, status, joining/exit, organization, and custom-filter reports. |
| RPT-002 | Reports | Attendance register | Partial | HRMS | Include status, punches, breaks, shifts, hours, exceptions, leave, and corrections. |
| RPT-003 | Reports | Late and overtime report | Partial | HRMS | Use approved calculation snapshots and explain policy/timezone. |
| RPT-004 | Reports | Attendance violations/security report | Partial | HRMS | Include geofence, device, face, replay, field, and exception outcomes. |
| RPT-005 | Reports | Leave reports | Partial | HRMS | Include balances, accrual, usage, liability, approvals, and policy assignment. |
| RPT-006 | Reports | Field distance/routes report | Partial | HRMS | Respect field entitlement, privacy, scope, retention, and calculation confidence. |
| RPT-007 | Reports | Payroll reports | Partial | HRMS | Enforce payroll capability, field authorization, period locking, and audit. |
| RPT-008 | Jobs | Asynchronous report jobs | Partial | HRMS | Queue large reports, show progress/failure, retry safely, expire files, and notify. |
| RPT-009 | Export | CSV/XLSX/PDF exports | Partial | HRMS | Generate typed/localized outputs with stable schemas and no formula injection. |
| RPT-010 | Access | Report row/field scope | Partial | HRMS | Apply user permission, reporting scope, capability, tenant, and sensitive-field masking. |
| RPT-011 | Audit | Export audit trail | Partial | HRMS | Record requester, filters, row count, file, purpose, delivery, and expiry. |
| RPT-012 | Scheduling | Scheduled reports | Future candidate | HRMS | Deliver approved reports on schedule with recipient validation and revocation. |

## P. HRMS web application

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| WEB-001 | Shell | Product-owned HRMS shell | Implemented foundation | HRMS | Preserve existing tenant HRMS dashboard and features while using shared identity/navigation contracts. |
| WEB-002 | Routing | Canonical `/{locale}/app/hrms` routes | Partial | Shared | Fix every flat/legacy URL, direct navigation, refresh, nested route, and return URL. |
| WEB-003 | Routing | Canonical `/api/hrms/v1` API calls | Partial | HRMS | Remove legacy flat API paths and add CI architecture checks. |
| WEB-004 | Navigation | Capability/permission-driven navigation | Partial | HRMS | Generate visible modules from effective entitlements and user authorization. |
| WEB-005 | Loading | Stable loading/skeleton states | Partial | HRMS | Avoid permanent blank pages and distinguish loading, empty, forbidden, missing, and failed states. |
| WEB-006 | Errors | Actionable API error handling | Partial | HRMS | Translate stable errors into retry, upgrade, permission, support, or correction actions. |
| WEB-007 | Localization | English UI | Implemented foundation | HRMS | Complete all strings, formats, validation messages, notifications, exports, and accessibility labels. |
| WEB-008 | Localization | Arabic and RTL UI | Partial | HRMS | Complete catalogs, layout mirroring, typography, tables, charts, forms, dates, and tests. |
| WEB-009 | Themes | Platform theme integration | Partial | Shared | Apply tenant theme while preserving accessibility and product identity. |
| WEB-010 | Responsive | Desktop/tablet/mobile web layouts | Validation pending | HRMS | Validate navigation, tables, forms, dialogs, overflow, and touch targets. |
| WEB-011 | Accessibility | Keyboard and screen-reader support | Validation pending | HRMS | Validate focus order, dialogs, forms, error announcements, contrast, and semantics. |
| WEB-012 | Search | Global HRMS search | Partial | HRMS | Scope employee/pages/settings results by authorization and support keyboard navigation. |
| WEB-013 | Security | CSRF/XSS/clickjacking protections | Partial | Shared | Validate cookie/session model, headers, sanitization, uploads, deep links, and error content. |
| WEB-014 | Performance | Web performance | Validation pending | HRMS | Measure route load, large tables, bundles, caching, rendering, and slow APIs. |
| WEB-015 | Testing | Real-stack Playwright flows | Missing | Shared | Cover Platform login, product launch, HRMS CRUD, attendance, leave, reports, billing, and denials. |

## Q. HRMS mobile application

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| MOB-001 | Ownership | Canonical HRMS mobile codebase | Implemented foundation | HRMS | Ownership is declared in READMEs/CODEOWNERS and a temporary parity guard passes; independent HRMS CI/release evidence remains required before deleting the Platform copy. |
| MOB-002 | Auth | Platform login client | Partial | HRMS mobile | Authenticate only with Platform and securely store rotating Platform session credentials. |
| MOB-003 | Auth | HRMS product-token exchange | Missing | Shared | Exchange Platform session for short-lived HRMS audience token and refresh safely. |
| MOB-004 | Networking | Separate Platform and HRMS API clients | Missing | HRMS mobile | Use correct base URLs, tokens, retry, error mapping, and certificate/security settings. |
| MOB-005 | Routing | Migrate legacy flat HRMS endpoints | Missing | HRMS mobile | Move all calls to separated `/api/hrms/v1/*` contracts. |
| MOB-006 | Runtime | Mobile runtime configuration endpoint | Missing | Shared | Provide Platform/product URLs, supported features, environment, minimum version, and maintenance state. |
| MOB-007 | Identity | Self profile/preferences APIs | Missing | HRMS | Return employee linkage, authorization context, locale, timezone, and product configuration. |
| MOB-008 | Attendance | Today/check-in/check-out/break flow | Partial | HRMS mobile | Complete against separated APIs with idempotency, evidence, errors, and authoritative refresh. |
| MOB-009 | Attendance | Attendance history/day details | Missing | HRMS | Add separated self-service endpoints and complete mobile UI. |
| MOB-010 | Leave | Leave balances/requests/history | Partial | HRMS mobile | Migrate separated APIs, documents, cancellation, approvals if authorized, and notification links. |
| MOB-011 | Corrections | Regularization flow | Missing | HRMS | Add self submit/list/detail/cancel/evidence APIs and mobile screens. |
| MOB-012 | Devices | Device registration/trust | Partial | HRMS mobile | Migrate registration, approval state, integrity challenge, replacement, and blocking flows. |
| MOB-013 | Biometrics | Face consent/enrollment/verification | Partial | HRMS mobile | Implement the approved full flow and never authorize attendance from a client-only result. |
| MOB-014 | Field | Field session/location tracking | Implemented; device validation pending | HRMS mobile | Separated consent/session/ping APIs, native worker configuration, restart restoration, offline replay, denial handling, and disclosure are implemented. Physical-device endurance evidence remains required. |
| MOB-015 | Notifications | Push token registration | Missing | Shared | Register/refresh/remove token with correct tenant, identity, app, environment, and device. |
| MOB-016 | Notifications | Push deep-link handling | Partial | HRMS mobile | Open authorized product route, handle logged-out/expired token state, and reject unsafe links. |
| MOB-017 | Offline | Tenant/user-scoped offline storage | Missing | HRMS mobile | Partition and encrypt queues/cache by tenant, membership, employee, device, and environment. |
| MOB-018 | Offline | Bounded replay and receipts | Missing | HRMS mobile | Replay in order with dedupe, retry caps, conflict resolution, receipt persistence, and user visibility. |
| MOB-019 | Workers | Headless/background session bootstrap | Implemented foundation | HRMS mobile | Restores the authoritative active session and reschedules workers; authoritative denial/logout stops tracking and clears work. Physical OS-kill/reboot validation remains required. |
| MOB-020 | Security | Secure secret/token storage | Partial | HRMS mobile | Use platform keystore/keychain, rotation, logout wipe, screenshot/log redaction, and compromise handling. |
| MOB-021 | Security | Root/jailbreak/tamper signals | Future candidate | HRMS mobile | Define risk policy and fallback; do not treat client detection as infallible. |
| MOB-022 | UX | Permission education/recovery | Partial | HRMS mobile | Explain camera/location/background/notification permissions and provide recovery paths. |
| MOB-023 | UX | Localization and RTL | Partial | HRMS mobile | Validate English/Arabic, layout direction, formats, notifications, offline errors, and accessibility. |
| MOB-024 | Reliability | App version enforcement | Missing | Shared | Support minimum/recommended version, maintenance, staged rollout, and forced security upgrade. |
| MOB-025 | Testing | Android real-stack suite | Missing | HRMS | Test emulator and physical device auth, attendance, offline, field, face, notifications, and deep links. |
| MOB-026 | Testing | iOS real-stack suite | Missing | HRMS | Test simulator and physical device auth, attendance, background rules, push, face, and deep links. |
| MOB-027 | Release | Mobile CI/signing/store release | Missing | HRMS | Protect signing, record artifact provenance, stage rollout, monitor, and rollback. |
| MOB-028 | Operations | Crash reporting and mobile analytics | Missing | HRMS | Capture privacy-safe crashes, network failures, sync health, and version adoption. |
| MOB-029 | Cleanup | Remove duplicate Platform mobile app | Missing | Shared | Delete only after parity, signing ownership, rollout, and rollback gates pass. |

## R. Gateway, routing, and service communication

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| GTW-001 | Web routing | Platform route ownership | Implemented foundation | Gateway | Route workspace, login, billing, plan, and control-plane pages/APIs to Platform. |
| GTW-002 | Web routing | HRMS product route ownership | Implemented foundation | Gateway | Route locale-aware HRMS pages and deep links to HRMS web. |
| GTW-003 | API routing | HRMS API prefix routing | Partial | Gateway | Route `/api/hrms/v1/*` to HRMS API and prevent collision with Platform pages/APIs. |
| GTW-004 | Context | Forward tenant/host/protocol/IP/request ID | Partial | Gateway | Preserve trusted context and reject spoofed forwarded headers. |
| GTW-005 | Security | TLS and security headers | Validation pending | Gateway | Validate production TLS, HSTS, CSP, cookie attributes, body limits, and headers. |
| GTW-006 | Resilience | Timeouts/retries/circuit behavior | Missing | Gateway | Use safe method-aware policies and controlled product unavailable responses. |
| GTW-007 | Limits | Rate and body-size limits | Partial | Gateway | Define per route/product/tenant limits, upload exceptions, and observable rejections. |
| GTW-008 | Domains | Tenant custom-domain routing | Partial | Gateway | Resolve tenant safely and route Platform/product pages without leaking internal hosts. |
| GTW-009 | Internal API | Product-to-Platform internal client | Partial | Shared | Use scoped service credentials, strict allowlist, timeout, retry, idempotency, and audit. |
| GTW-010 | Internal API | No cross-product database access | Partial | Shared | Enforce architecture guard and replace remaining direct reads with APIs/events. |

## S. Data ownership, separation, and migration

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| DAT-001 | Schema | Platform-only schema/client | Partial | Platform | Compile and run Platform without HRMS models or HRMS database access. |
| DAT-002 | Schema | HRMS-only schema/client | Partial | HRMS | Own organization, employee, attendance, leave, field, face, payroll, files, and HRMS audit data. |
| DAT-003 | Isolation | Independent databases | Implemented foundation | Shared | Validate credentials, migrations, backups, restores, scaling, and no runtime cross-access. |
| DAT-004 | IDs | Stable cross-service identifiers | Partial | Shared contract | Use tenant/user/product external IDs without shared database foreign keys. |
| DAT-005 | Migration | Tenant-scoped snapshot exporter | Missing | Shared | Export bounded consistent snapshots with watermark, schema version, counts, and checksums. |
| DAT-006 | Migration | Idempotent HRMS importer | Missing | HRMS | Import with stable external IDs, validation, batching, retry, resume, and duplicate protection. |
| DAT-007 | Migration | Migration ledger | Missing | Shared | Record tenant/entity/batch/checksum/status/timestamps/errors and replay history. |
| DAT-008 | Migration | Final delta/change replay | Missing | Shared | Replay changes after snapshot or execute an approved write freeze/dual-write strategy. |
| DAT-009 | Reconciliation | Row-count reconciliation | Missing | Shared | Compare every entity by tenant and explain all differences. |
| DAT-010 | Reconciliation | Business-total reconciliation | Missing | Shared | Compare employee, attendance, leave, payroll, document, and report totals. |
| DAT-011 | Reconciliation | Referential integrity checks | Missing | HRMS | Detect missing parents, orphans, duplicate external IDs, and invalid tenant references. |
| DAT-012 | Reconciliation | Query/index validation | Missing | HRMS | Validate indexes and representative query plans after migration. |
| DAT-013 | Files | HRMS object-storage migration | Missing | HRMS | Copy, checksum, re-key, authorize, retain, and reconcile documents/evidence/exports. |
| DAT-014 | Cutover | Pilot tenant migration | Missing | Shared | Migrate approved pilot, observe, reconcile, and approve before expansion. |
| DAT-015 | Cutover | Tenant-by-tenant routing cutover | Missing | Gateway | Switch safely with recorded state, smoke tests, and rollback target. |
| DAT-016 | Rollback | Data migration rollback | Missing | Shared | Preserve source authority, define post-cutover writes, test route reversal, and prevent loss. |
| DAT-017 | Retirement | Legacy monolith read removal | Missing | Shared | Remove after all consumers, reconciliation, observation, and rollback gates pass. |
| DAT-018 | Retirement | Legacy schema/client removal | Missing | Shared | Remove only after production traffic and jobs no longer depend on them. |

## T. Files, privacy, security, and compliance

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| SEC-001 | Isolation | Tenant isolation across APIs | Partial | Shared | Test IDs, filters, joins, exports, caches, search, workers, and support tools. |
| SEC-002 | Isolation | Tenant isolation across files | Partial | Products | Bind object keys and signed access to tenant/user/resource/purpose. |
| SEC-003 | Isolation | Tenant isolation across queues/events | Partial | Shared | Validate tenant in producer and consumer and reject cross-tenant/replayed payloads. |
| SEC-004 | Secrets | Secret management | Partial | Shared | Keep database, signing, provider, payment, SMTP, push, and storage secrets outside Git. |
| SEC-005 | Credentials | Service credential rotation | Missing | Platform | Rotate without outage and revoke compromised clients. |
| SEC-006 | Encryption | Encryption in transit and at rest | Validation pending | Shared | Verify databases, queues, object storage, backups, provider calls, and mobile storage. |
| SEC-007 | Files | Malware scanning | Missing | Products | Quarantine uploads, scan asynchronously/synchronously by risk, and prevent access before clearance. |
| SEC-008 | Files | Presigned upload/download | Partial | Products | Use short expiry, content constraints, resource binding, and post-upload validation. |
| SEC-009 | Privacy | Data classification | Missing | Shared | Classify identity, HR, location, biometric, payroll, documents, logs, and analytics data. |
| SEC-010 | Privacy | Retention schedule | Missing | Shared | Define per data class, tenant plan, legal hold, backup, export, and deletion behavior. |
| SEC-011 | Privacy | Data subject access/export | Missing | Shared | Coordinate identity and product data safely with authorization and audit. |
| SEC-012 | Privacy | Data deletion/anonymization | Missing | Shared | Apply verified deletion/anonymization across services, files, indexes, events, and backups. |
| SEC-013 | Audit | Immutable privileged audit | Partial | Shared | Record admin, entitlement, role, employee, attendance, field, face, payroll, export, and support actions. |
| SEC-014 | Application | OWASP/API security tests | Missing | Shared | Cover injection, XSS, CSRF, SSRF, IDOR, mass assignment, upload abuse, and auth bypass. |
| SEC-015 | Tokens | Token misuse/replay tests | Missing | Shared | Cover wrong issuer/audience/tenant, expired, revoked, duplicate ID, clock skew, and stolen token. |
| SEC-016 | Abuse | Rate limiting and anti-automation | Partial | Shared | Protect login, invite, reset, punch, evidence, imports, reports, and provider callbacks. |
| SEC-017 | Vulnerability | Dependency/container scanning | Validation pending | Shared | Run in CI, define severity policy, exceptions, SBOM, and remediation evidence. |
| SEC-018 | Compliance | Legal terms and privacy notices | Decision required | Platform | Cover general service plus product-specific HR, field, biometric, and payroll processing. |
| SEC-019 | Compliance | Consent and policy versioning | Missing | Shared | Preserve accepted version, locale, time, actor, withdrawal, and replacement policy. |
| SEC-020 | Security | Incident response | Missing | Shared | Cover identity, tenant breach, payroll exposure, biometric/location incident, provider compromise, and notification. |

## U. Observability, reliability, and operations

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| OPS-001 | Logs | Structured correlated logs | Partial | Shared | Include service/product/tenant/request/correlation/trace context without tokens or sensitive payloads. |
| OPS-002 | Tracing | Distributed tracing | Missing | Shared | Trace gateway, Platform, HRMS, workers, internal calls, events, and providers. |
| OPS-003 | Metrics | Service/API metrics | Partial | Shared | Measure traffic, latency, errors, saturation, database, cache, queue, and dependency health. |
| OPS-004 | Metrics | Business/security metrics | Missing | Shared | Measure login, denial, entitlement, capacity, punch, sync, field, face, payroll, notification, and migration outcomes. |
| OPS-005 | Alerts | Actionable alerting | Missing | Shared | Define thresholds, routing, severity, dedupe, escalation, and runbook links. |
| OPS-006 | Health | Liveness/readiness probes | Partial | Shared | Distinguish process health from dependency readiness and expose product health to Platform. |
| OPS-007 | Queues | Queue lag/failure monitoring | Missing | Shared | Monitor outbox, lifecycle, notifications, reports, usage, and migration/replay jobs. |
| OPS-008 | Database | Independent backups | Partial | Shared | Configure encrypted scheduled backups with retention and access control per service. |
| OPS-009 | Recovery | Restore drills | Missing | Shared | Restore Platform and HRMS independently and validate application/reconciliation results. |
| OPS-010 | Availability | Platform outage with HRMS running | Validation pending | Shared | Define safe cached access, high-risk fail-closed rules, monitoring, and recovery. |
| OPS-011 | Availability | HRMS outage with Platform running | Validation pending | Shared | Keep Platform usable and display controlled product outage/recovery state. |
| OPS-012 | Availability | Redis/queue/storage/email/push outage | Validation pending | Shared | Define degraded behavior, retry, reconciliation, user message, and alerting. |
| OPS-013 | Scaling | Load and capacity tests | Missing | Shared | Cover login, tokens, employees, attendance peaks, field pings, reports, payroll, usage, and notifications. |
| OPS-014 | Reliability | Idempotency and replay tests | Missing | Shared | Cover API retry, outbox duplicate, webhook duplicate, offline replay, event ordering, and worker restart. |
| OPS-015 | Runbooks | Outage runbooks | Missing | Shared | Cover service, database, cache, queue, object storage, providers, gateway, and DNS/TLS incidents. |
| OPS-016 | Runbooks | Migration/replay/rollback runbooks | Missing | Shared | Provide exact validation, stop, resume, replay, reconcile, rollback, and approval steps. |
| OPS-017 | Support | Support diagnostic tools | Missing | Shared | Safely inspect tenant/product state, entitlement explanation, event delivery, usage, and health. |
| OPS-018 | Status | Customer-visible service status | Future candidate | Platform | Communicate product incidents and maintenance without exposing sensitive infrastructure. |

## V. CI/CD, deployment, and release readiness

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| CICD-001 | CI | Platform independent pipeline | Partial | Platform | Typecheck, lint, unit, integration, architecture, migration, build, security, and artifact steps. |
| CICD-002 | CI | HRMS API independent pipeline | Partial | HRMS | Typecheck, unit, integration, architecture, OpenAPI, migration, build, security, and artifact steps. |
| CICD-003 | CI | HRMS web independent pipeline | Partial | HRMS | Typecheck, lint, unit/component, localization, Playwright, production build, and artifact steps. |
| CICD-004 | CI | HRMS mobile independent pipeline | Missing | HRMS | Analyze/test/build/sign real-stack Android/iOS artifacts and retain evidence. |
| CICD-005 | CI | Shared contract release pipeline | Partial | Shared contract | Validate compatibility, publish immutable version, sign/provenance, changelog, and consumer checks. |
| CICD-006 | CI | Architecture boundary guards | Partial | Shared | Reject cross-database imports, legacy API routes, duplicate contract copies, and product-name conditionals. |
| CICD-007 | CI | Clean-checkout reproducibility | Validation pending | Shared | Install published dependencies and produce artifacts without local workspace links. |
| CICD-008 | Containers | Platform production image | Partial | Platform | Use minimal non-root image, health checks, immutable tag, SBOM, and configuration validation. |
| CICD-009 | Containers | HRMS API/web production images | Partial | HRMS | Build independently with correct migrations, health checks, secrets, and rollback tags. |
| CICD-010 | Deployment | Independent Platform deployment | Partial | Platform | Deploy/rollback without restarting HRMS. |
| CICD-011 | Deployment | Independent HRMS deployment | Partial | HRMS | Deploy/rollback API and web without restarting Platform. |
| CICD-012 | Deployment | Gateway deployment and rollback | Partial | Gateway | Validate routes/config before publish and retain previous safe configuration. |
| CICD-013 | Deployment | Database migration safety | Partial | Shared | Use additive/compatible migrations, backups, expand-contract sequence, and rollback plan. |
| CICD-014 | Deployment | Staging parity | Missing | Shared | Use production-like topology, contract version, gateway, databases, storage, queues, and secrets. |
| CICD-015 | Deployment | Blue-green/canary rollout | Missing | Shared | Rehearse health gates, traffic shift, rollback, migration compatibility, and monitoring. |
| CICD-016 | Evidence | Release evidence bundle | Missing | Shared | Retain versions, commits, images, migrations, tests, security scans, screenshots, and approvals. |
| CICD-017 | Production | Backup/restore before release | Missing | Shared | Verify backup completion and tested restore access before schema/data cutovers. |
| CICD-018 | Production | Post-release smoke/reconciliation | Missing | Shared | Verify login, product launch, core HRMS flows, jobs, usage, notifications, and tenant isolation. |

## W. Testing and quality coverage

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| TST-001 | Unit | Platform domain unit tests | Implemented foundation | Platform | Cover identity, catalog, subscription, entitlement, limits, notifications, and lifecycle rules. |
| TST-002 | Unit | HRMS domain unit tests | Implemented foundation | HRMS | Preserve existing suite and expand for separated auth, capabilities, field, face, and limits. |
| TST-003 | Integration | Platform database/integration tests | Partial | Platform | Run against Platform-only schema and real infrastructure dependencies where needed. |
| TST-004 | Integration | HRMS database/integration tests | Partial | HRMS | Run against HRMS-only schema and exercise auth/capability/tenant boundaries. |
| TST-005 | Contract | API contract tests | Partial | Shared | Verify Platform, HRMS, web, mobile, and gateway against published specifications. |
| TST-006 | Contract | Event contract tests | Missing | Shared | Validate schemas, compatibility, idempotency, ordering assumptions, and unknown fields. |
| TST-007 | E2E | Workspace signup/login flow | Validation pending | Platform | Cover signup, verification, login, company switching, recovery, logout, and deep-link return. |
| TST-008 | E2E | Product launch/SSO flow | Validation pending | Shared | Cover enabled, disabled, provisioning, unavailable, suspended, revoked, and locale routes. |
| TST-009 | E2E | HRMS organization/employee flow | Validation pending | HRMS | Cover setup, employee lifecycle, import, access, documents, and history. |
| TST-010 | E2E | Attendance/leave flow | Validation pending | HRMS | Cover schedules, punch, breaks, register, corrections, leave, approvals, and reports. |
| TST-011 | E2E | Field attendance flow | Partial | HRMS | API/mobile integration coverage now exercises consent, checked-in session start, ping, active session, stop, and checkout; live gateway, manager route, retention, and physical-device acceptance remain to be evidenced together. |
| TST-012 | E2E | Face attendance flow | Missing | HRMS | Cover consent, enrollment, liveness, punch, retry/fallback, review, and deletion. |
| TST-013 | E2E | Payroll flow | Validation pending | HRMS | Cover setup, inputs, calculate, review, approve, lock, outputs, correction, and report. |
| TST-014 | E2E | Plans and capacity flow | Missing | Shared | Cover Silver-50, employee 50/51, upgrade, downgrade, add-on, removal, and stale sessions. |
| TST-015 | E2E | Notification flow | Missing | Shared | Cover in-app/email/push preferences, delivery, deep links, retry, invalid tokens, and mandatory events. |
| TST-016 | Security | Tenant isolation suite | Partial | Shared | Attempt cross-tenant access in APIs, IDs, files, exports, jobs, caches, events, and support tools. |
| TST-017 | Security | Permission/capability matrix | Missing | Shared | Test capability absent/present against permission absent/present and each resource scope. |
| TST-018 | Security | Mobile security tests | Missing | HRMS | Test token/storage/log leakage, tenant switch, replay, rooted signals, deep links, and TLS behavior. |
| TST-019 | Performance | Peak attendance load tests | Missing | HRMS | Test shift-boundary punches, offline replay, dashboards, and calculations. |
| TST-020 | Performance | Field ingestion load tests | Missing | HRMS | Test ping volume, batching, ordering, storage, live-board freshness, and retention jobs. |
| TST-021 | Performance | Payroll/report job tests | Missing | HRMS | Test large tenants, concurrency, queue pressure, files, and recovery. |
| TST-022 | Recovery | Failure-injection tests | Missing | Shared | Test product/Platform/cache/queue/storage/provider/database failures and restart/replay. |
| TST-023 | Regression | Legacy test migration | Partial | HRMS | Retarget useful 650+ tests to separated routes, schemas, auth, and real ownership boundaries. |
| TST-024 | Acceptance | Production-like acceptance evidence | Missing | Shared | Replace monolith/local-only claims with reproducible evidence from intended topology/artifacts. |

## X. Reusable onboarding for Mail, POS, and future products

| ID | Domain | Feature | Status | Boundary | Completion requirement |
|---|---|---|---|---|---|
| ONB-001 | Discovery | Product ownership and boundary review | Partial | Shared | Name owners and document product data, Platform data, compliance, providers, RPO, and RTO. |
| ONB-002 | Registration | Product key/audience/routes registration | Partial | Shared | Approve unique values and prevent collisions. |
| ONB-003 | Manifest | Product manifest submission/validation | Partial | Shared | Validate capabilities, permissions, limits, locales, health, lifecycle, and UI metadata. |
| ONB-004 | Contract | Contract registry extension | Partial | Shared contract | Add product vocabulary without hard-coded Platform logic. |
| ONB-005 | Auth | Product token validation template | Partial | Shared | Reuse secure issuer/audience/tenant/identity/entitlement validation. |
| ONB-006 | Authorization | Capability/permission/scope guard template | Missing | Shared | Provide reusable middleware and conformance tests. |
| ONB-007 | Lifecycle | Provision/suspend/reactivate/delete handlers | Partial | Products | Implement idempotent consumers and expose state/health. |
| ONB-008 | Events | Product outbox and receipt template | Partial | Products | Publish business/usage events and consume lifecycle/configuration events safely. |
| ONB-009 | Usage | Product usage metrics integration | Missing | Shared | Define metrics and reconcile without cross-database queries. |
| ONB-010 | Billing | Edition/capacity/add-on mapping | Missing | Platform | Configure product plan semantics entirely through catalog/manifest data. |
| ONB-011 | Navigation | Shared shell/product launcher integration | Partial | Shared | Support locale, tenant, deep links, themes, unauthorized, and unavailable states. |
| ONB-012 | Localization | Product locale contract | Partial | Shared | Declare supported locales/fallback and validate English/Arabic/RTL where required. |
| ONB-013 | Notifications | Platform notification integration | Partial | Shared | Use versioned events/templates/deep links and product-owned recipient/business context. |
| ONB-014 | Data | Independent database/object storage | Partial | Products | Enforce ownership, backup, restore, retention, and tenant isolation. |
| ONB-015 | Operations | Logs/metrics/traces/health integration | Partial | Shared | Provide standard fields and Platform product-health visibility. |
| ONB-016 | Development | Local composition profile | Partial | Shared | Start Platform, gateway, product, databases, queues, and dependencies predictably. |
| ONB-017 | Verification | Automated conformance suite | Missing | Shared | Test auth, isolation, entitlements, lifecycle, events, routing, localization, failure, and recovery. |
| ONB-018 | Documentation | Developer integration guide | Implemented foundation | Shared | Maintain package install, manifest, auth, permissions, limits, events, local test, deploy, and support flow. |
| ONB-019 | Reference | Reference/sample product | Missing | Shared | Demonstrate the smallest correct product integration independent of HRMS complexity. |
| ONB-020 | Architecture | No product-name conditionals in Platform | Missing | Platform | Enforce via registry design, review rules, and automated architecture checks. |

## Y. Product decisions still requiring explicit approval

These are not implementation tasks that engineering should silently guess.

| ID | Decision | Recommended baseline |
|---|---|---|
| DEC-001 | HRMS commercial boundary | One HRMS product containing separately entitled capabilities. |
| DEC-002 | Plan model | Separate feature edition from employee capacity. |
| DEC-003 | Initial capacity packages | 50, 100, 200, and custom. |
| DEC-004 | Billable employees | Count active, invited/onboarding, and future starters; explicitly decide suspended/archived rules. |
| DEC-005 | Tenant authorization | Tenant HRMS admin manages team roles within capabilities purchased through Platform. |
| DEC-006 | Subscription state policy | Approve behavior for trial, active, grace/past-due, suspended, canceled, and no subscription. |
| DEC-007 | Field tracking privacy | Approve notice/consent, hours, precision, retention, manager access, and employee transparency. |
| DEC-008 | Face verification technology | Prefer evaluated liveness/matching provider for initial release. |
| DEC-009 | Biometric compliance | Approve launch jurisdictions, lawful basis, alternative method, retention, deletion, and residency. |
| DEC-010 | Payroll markets | Claim support only for approved, validated jurisdictions and statutory outputs. |
| DEC-011 | Mobile release scope | Android and iOS; add web/desktop only by explicit product decision. |
| DEC-012 | SMS/WhatsApp | Treat as future channels until provider, compliance, pricing, consent, and opt-out are approved. |
| DEC-013 | Support impersonation | Allow only with explicit controlled policy or prohibit it. |
| DEC-014 | Production migration | Approve pilot tenants, observation window, rollback window, source retention, and final-delta strategy. |

## Z. Existing evidence sources

This inventory was consolidated from the following repository documents and the implementation findings recorded in them:

- `COMPLETE-PLATFORM-AND-HRMS-PRODUCT-ROADMAP.md`
- `PLATFORM-HRMS-SEPARATION-CORRECTIVE-IMPLEMENTATION-PLAN.md`
- `HRMS-MOBILE-OWNERSHIP-AND-API-MIGRATION-IMPLEMENTATION-PLAN.md`
- `HRMS-PLANS-PRICING-AND-ENTITLEMENT-CORRECTIVE-IMPLEMENTATION-PLAN.md`
- `PRODUCT-INTEGRATION-AND-DEPLOYMENT-GUIDE.md`
- `PRODUCT-ONBOARDING-AND-PLATFORM-INTEGRATION-STANDARD.md`
- `PLATFORM-MODULE-AND-PLAN-CATALOG-IMPLEMENTATION-PLAN.md`
- `CURRENT-PLATFORM-HRMS-COUPLING-INVENTORY.md`
- `HRMS-DATA-EXTRACTION-READINESS.md`
- `LOCAL-PLATFORM-HRMS-SEPARATION-REHEARSAL.md`
- `deltcrm-hrms/docs/plans/multi-product-platform/HRMS-SEPARATION-MASTER-CHECKLIST.md`
- `deltcrm-hrms/docs/MULTI-PRODUCT-PLATFORM-INTEGRATION-IMPLEMENTATION-PLAN.md`

## Conversion note

For CSV/XLSX conversion, combine the tables using these columns:

```text
ID, Domain, Feature, Status, Boundary, Completion requirement
```

Keep the `Decision required` and `Future candidate` statuses intact. They prevent audit-added ideas from being mistaken for approved implementation commitments.
