# Sprint 8 Implementation Plan

## Billing, Revenue Operations, Hardening and General Availability

**Status:** In progress
**Depends on:** Sprint 2 platform control plane and product gates from Sprints 3-7  
**Primary references:** roadmap Phase 6; feature section 1 and Business Admin B10  
**Sprint exit:** The existing platform control plane can sell plans, collect payments, issue GST invoices, run dunning and expose real revenue/payment health; production security, recovery, retention and release gates are satisfied.

## 1. Included Scope

- Subscription plans, billing profiles, subscriptions and seat synchronization
- Razorpay primary adapter with Stripe-compatible port
- Idempotent webhooks, payment attempts, GST invoices/PDFs and dunning
- Self-serve signup GA decision and A2/A3 production completion
- B10, S5-S8, plus real billing/revenue enhancements for S1 and payment-provider health for S11
- Backups, retention, load/security review, runbooks and release readiness

## 2. Trust Boundaries

- Platform APIs use the admin connection only inside a separate platform module
- Tenant APIs never accept platform authority implicitly
- Platform staff require MFA and explicit permissions
- Impersonation uses a short-lived scoped token, reason and double-attributed audit
- Payment webhooks authenticate raw payload signatures before JSON processing
- Billing/provider secrets live in managed secrets, never repository files or client bundles

## 3. API Contract

### Tenant billing
- `GET|PATCH /billing/profile`
- `GET /billing/subscription`
- `POST /billing/subscription/change-plan`
- `GET /billing/invoices`
- `GET /billing/invoices/:id`
- `GET /billing/invoices/:id/download`
- `GET|POST /billing/payment-methods`
- `DELETE /billing/payment-methods/:id`
- `POST /billing/webhooks/razorpay`
- `POST /billing/webhooks/stripe`

### Platform billing operations
- `GET|POST /platform/plans`
- `PATCH /platform/plans/:id`
- `GET /platform/invoices`
- `GET /platform/invoices/:id`
- `GET /platform/payment-transactions`
- `GET /platform/dunning`
- `POST /platform/dunning/:subscriptionId/retry`
- `GET /platform/dashboard/billing`
- `GET /platform/health/payment-providers`

## 4. Billing Rules

- [x] Plans define currency, interval, per-seat price, employee maximum and module bundle
- [x] Employee count synchronizes seats through idempotent events
- [x] Webhook event ID is unique and replay returns prior outcome
- [x] Every charge attempt creates a payment transaction
- [x] Invoice numbers are sequential under a database lock and include GST breakdown
- [x] Invoice PDFs are immutable private objects with signed downloads
- [x] Dunning progresses reminder, grace, suspend-pending and suspension idempotently
- [x] Suspension immediately blocks tenant sessions/routes while preserving platform support access

## 5. Sprint 2 Platform Integration

- [x] S1 replaces deferred billing cards with authoritative MRR, plan mix, failed-payment and recent-subscription data
- [x] S11 adds Razorpay/Stripe latency, webhook lag and payment failure health
- [x] Plan/payment/dunning actions reuse Sprint 2 MFA, platform permissions and system audit
- [x] Dunning suspension calls the Sprint 2 idempotent tenant lifecycle command rather than updating tenant status directly
- [x] Module bundles call Sprint 2 module validation and assignment contracts
- [x] Sprint 2 impersonation restrictions continue to forbid billing mutation

## 6. Web Implementation

- [x] B10 billing profile, plan, usage, method, invoice and quota UI
- [x] S5/S6 plan list/editor
- [x] S7/S8 invoices, payments and dunning
- [x] S1 billing/revenue dashboard enhancement
- [x] S11 payment-provider health enhancement
- [x] A2/A3 production self-serve signup retained for GA with email-gateway delivery and recovery state

## 7. Hardening and Operations

- [x] API/web/mobile production build and environment validation
- [ ] External penetration test; close all critical/high findings
- [ ] Backup and point-in-time recovery drill with measured RPO/RTO
- [x] Verify partition creation and retention jobs for pings, notifications and tokens
- [x] k6 punch, sync, ping, report and live-board targets with documented budgets
- [ ] Sentry/OTel dashboards and alert routing
- [x] Runbooks for on-call, dunning, provider outage, impersonation and data deletion
- [x] Biometric deletion/churn workflow and evidence
- [ ] Store submissions, privacy disclosures and background-location justification
- [x] Force-upgrade/minimum-version gate for mobile

## 8. Ordered Work Packages

- [x] 8.0 Billing schema, money/tax domain and provider ports
- [x] 8.1 Plans, subscriptions, billing profile and B10/S5-S6
- [x] 8.2 Gateway, webhooks, transactions, invoices and S7-S8
- [x] 8.3 Dunning, Sprint 2 suspension integration and S1/S11 enhancements
- [x] 8.4 A2/A3 GA signup decision and implementation
- [ ] 8.5 Security, recovery, retention, load and release gates

## 9. Test Plan

- [x] Webhook replay and out-of-order delivery idempotency
- [x] Concurrent invoice numbering and seat synchronization
- [x] Failed payment dunning to suspension and successful recovery
- [x] Suspended tenant access/refresh rejection across all modules
- [x] Regression: Sprint 2 MFA, least privilege, impersonation restrictions and admin-connection isolation
- [x] Plan module-bundle changes respect Sprint 2 module guards and hidden UI navigation
- [x] Backup restore, retention dry run and partition boundary tests
- [ ] Load targets and external security findings regression suite

## 10. Definition of Done

- [x] Tenant can sign up/onboard, subscribe, pay and retrieve a valid invoice
- [x] Dunning and suspension are automated and reversible safely
- [x] Platform support actions are strongly authenticated and fully audited
- [ ] No critical/high penetration-test findings remain
- [ ] Recovery, retention, monitoring and runbooks are exercised
- [x] API reference and administrator/HR/employee guidance are published in repository release artifacts
- [ ] Production deployment and mobile store release gates pass

## 11. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 8.0 Billing domain and provider ports | Complete | Billing migrations/domain/provider tests; API build |
| 8.1 Plans and subscriptions | Complete | `sprint8-billing-ga.e2e-spec.ts`; B10/S5-S6 Playwright |
| 8.2 Payments and invoices | Complete | Connected signup-to-paid-invoice e2e; signed webhook, concurrent invoice, PDF and S7-S8 tests |
| 8.3 Dunning and platform enhancements | Complete | Suspension/recovery e2e; S1/S11 implementation |
| 8.4 Self-serve signup GA | Complete | Email delivery integration; auth-flow e2e; A2/A3 responsive Playwright |
| 8.5 Hardening and release | In progress | Builds, retention, deletion, force-upgrade, k6 profiles and runbooks complete; external/infrastructure gates pending |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

## 12. Implementation Specification

### 12.1 Physical isolation and module layout

```text
platform/billing/  # extends Sprint 2 app_admin platform module
billing/
├── domain/        # money, tax, invoice, subscription/dunning state
├── application/   # commands, webhook handlers and jobs
├── infrastructure/# Razorpay/Stripe, PDF, storage and repositories
└── presentation/
operations/        # billing health, retention and release tools
```

Sprint 2 platform and tenant modules retain distinct Prisma service types. Billing extends those boundaries; it does not create a second platform auth/control plane. Webhook controllers use raw request bodies and no tenant middleware.

### 12.2 Platform permission matrix

| Action | Super Admin | Support |
|---|---|---|
| Plans and module bundles | full | read only |
| Invoices/transactions/dunning | full | read only by default |
| Manual payment retry/refund | explicit billing permission + fresh MFA | no |
| Billing dashboard/provider health | read | read |
| Existing tenant lifecycle/impersonation/audit | inherited from Sprint 2 | inherited from Sprint 2 |

Tenant billing permissions remain `billing.subscription.read`, `billing.invoices.read`, `billing.payment-methods.manage` and new `billing.subscription.manage`/`billing.profile.manage`. HR roles remain billing-free.

### 12.3 DTO and webhook contracts

| DTO | Required rules |
|---|---|
| `BillingProfileDto` | legal name/email, normalized GSTIN/PAN, ISO currency, structured address |
| `CreatePlanDto` | unique name, decimal nonnegative price, currency, positive max employees, interval, module keys |
| `ChangePlanDto` | target plan and effective timing; server calculates proration |
| Gateway webhook | provider event ID/type/timestamp/signature/raw payload hash; internal normalized event |

Money is decimal minor-unit safe. Clients never submit totals, tax, invoice number, payment status, seat usage or dunning state as authoritative values.

### 12.4 Billing state rules

- Subscription statuses follow provider/internal events and preserve history; one current subscription invariant remains.
- Plan downgrade cannot violate active employee count/module dependencies; return preview before commit.
- Webhook receipt is inserted uniquely before handling. Duplicate returns 200 with prior result.
- Invoice sequence is database-locked and never reused after failure/void.
- GST is calculated from immutable billing snapshot and configured tax rules; invoice PDF matches stored totals/checksum.
- Dunning steps are time/idempotency keyed. Payment success cancels pending suspension and restores active state according to policy.
- Refunds create transaction records and accounting state; they do not delete original attempts.

### 12.5 Inherited platform safeguards

- Sprint 2 platform login/MFA/session and audit controls remain mandatory regression gates.
- High-risk plan, retry and refund operations require fresh MFA according to policy.
- Impersonation remains read-only for billing and cannot invoke gateway/dunning actions.
- Dunning lifecycle calls are attributed to the billing job/system actor in both billing and tenant lifecycle audits.

### 12.6 Error catalog

| Code | Status | Trigger |
|---|---:|---|
| `MFA_REQUIRED` | 401 | Password stage passed |
| `MFA_INVALID` | 401 | Invalid/replayed code |
| `PLATFORM_PERMISSION_DENIED` | 403 | Missing platform permission |
| `PLAN_IN_USE` | 409 | Unsafe plan deletion |
| `PLAN_DOWNGRADE_BLOCKED` | 409 | Seats/modules exceed target |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | Signature mismatch |
| `WEBHOOK_EVENT_CONFLICT` | 409 | Same ID, different payload hash |
| `PAYMENT_METHOD_REQUIRED` | 422 | Charge/plan operation lacks method |
| `INVOICE_NOT_PAYABLE` | 409 | Invalid invoice state |
| `TENANT_ALREADY_SUSPENDED` | 409 | Duplicate lifecycle command |
| `IMPERSONATION_NOT_ALLOWED` | 403 | Policy/target/scope restriction |
| `IMPERSONATION_EXPIRED` | 401 | Expired/ended session |

### 12.7 Required schema/migrations

- [x] Plan-to-module bundle relation and subscription/plan history if absent
- [x] Webhook receipt table with provider/event ID, payload hash, state, attempts and processed timestamp
- [x] Invoice billing/tax snapshot, line items, checksum and sequence mechanism
- [x] Payment-method token references only; never card/bank secrets
- [x] Dunning transition/history records and scheduled-action idempotency
- [x] Churn/deletion job state with legal retention and biometric purge evidence

### 12.8 Stitch acceptance

- Exact B10, S5-S8, S1/S11 enhancement states and final A2/A3 Stitch screens/assets are required; no generic admin template substitution.
- Platform shell is visually distinct enough to prevent tenant/platform confusion while preserving Stitch design.
- Money displays use invoice currency/locale and never floating-point formatting.
- Sprint 2 impersonation banner remains unchanged and billing actions stay disabled during impersonation.
- Billing/webhook/job states include processing, retry, past due, grace, suspended, paid, void and uncollectible variants.
- Screenshot tests cover 1440/1024 widths plus A2/A3 responsive states and print/PDF visual comparison for invoices.

### 12.9 Security and release evidence

Required artifacts: threat model, external penetration report and closure evidence, SBOM/dependency scan, secrets scan, backup/PITR drill log, retention dry-run, load report, provider outage drill, dunning runbook, impersonation policy, biometric deletion runbook, privacy/DPA documents, API/admin/HR/employee guides and release rollback plan.

Repository-owned artifacts completed on July 18, 2026:

- `docs/SPRINT-8-SECURITY-THREAT-MODEL.md`
- `docs/SPRINT-8-OPERATIONS-RUNBOOK.md`
- `docs/SPRINT-8-PRIVACY-AND-STORE-CHECKLIST.md`
- `docs/SPRINT-8-USER-GUIDE.md`
- `docs/SPRINT-8-RELEASE-AND-ROLLBACK.md`
- `docs/SPRINT-8-RELEASE-EVIDENCE.md`
- `docs/SPRINT-8-LOCAL-DRILL-REPORT.md`
- `docs/SPRINT-8-OBSERVABILITY-GATE.md` dashboard, alert budgets and correlated drill
- `docs/legal/` privacy notice, DPA, subprocessor and mobile permission/store drafts
- `scripts/operations/` backup, guarded restore smoke and retention audit tools
- `scripts/mobile-release-check.mjs` native DeltCRM identity/store guard
- `scripts/validate-ga-evidence.mjs` strict machine-readable GA gate validator
- `apps/api/scripts/observability-drill.ts` Sentry/OTel/on-call receipt probe
- `tests/load/sprint8/` punch, sync, ping, report and live-board budgets
- `artifacts/sbom/deltcrm.cdx.json` CycloneDX 1.6 production SBOM and checksum
- `artifacts/release/sprint8-ga-evidence.json` release gate status/evidence manifest

Local verification now covers the CycloneDX SBOM/checksum, dependency and
repository-secret scans, partition/retention audit, PostgreSQL backup/restore
smoke, payment-provider transport outage with reconciled audits, and short
punch/sync/report k6 smoke profiles. Still requiring environment/external
evidence: independent penetration report and closure, managed PostgreSQL
restore/PITR with measured RPO/RTO, production-like k6 results for all five
profiles, configured Sentry/OTel dashboard and alert receipt, approved
privacy/DPA text, production deployment and store submissions. These gates
intentionally keep Work Package 8.5 and the sprint status `In progress`.

Native store identity is now release-safe: Android and iOS use DeltCRM with
`com.deltcrm.employee`, OpenStreetMap identifies the same package, placeholder
native product names were removed, and an Android APK build proves the package
move. Signed store binaries and console approvals remain external release gates.

### 12.10 GA acceptance journey

A fresh tenant signs up or is manually invited, verifies email, completes onboarding, selects a plan, adds a payment method, receives modules, staffs employees, generates a GST invoice, experiences failed-payment reminder/grace/suspension, pays successfully and regains access. Support impersonates with MFA and reason, performs a permitted read, exits, and both audit trails reconcile. Webhook replay, duplicate jobs and process crashes do not duplicate invoices, charges, dunning transitions or audit outcomes.

Repository acceptance evidence: `apps/api/test/sprint8-billing-ga.e2e-spec.ts`
passes a connected signup, email verification, login, idempotent onboarding,
billing-profile, tokenized-method, immediate paid-plan change, signed payment
webhook, immutable paid invoice and private PDF retrieval journey. The same
suite covers webhook replay/conflict/out-of-order handling, provider outage,
dunning suspension/recovery, seat synchronization and platform billing access.
