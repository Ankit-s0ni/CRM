# DeltCRM Subprocessor Register

**Status:** Deployment template - provider selection and legal approval pending  
**Last reviewed:** 2026-07-18  
**Change-notice contact:** `[PRIVACY_EMAIL]`

Do not publish example providers as active. The release owner must replace each
row with the provider actually configured in managed production secrets, its
legal entity, processing region, DPA link, transfer mechanism and deletion SLA.

| Function | Active provider/legal entity | Data | Region | Transfer/DPA | Deletion SLA | Status |
|---|---|---|---|---|---|---|
| Cloud hosting and managed PostgreSQL | `[PROVIDER]` | Application, tenant, audit and billing records | `[REGION]` | `[LINK/MECHANISM]` | `[SLA]` | PENDING |
| Private object storage/backups | `[PROVIDER]` | Private evidence, exports, invoices and backups | `[REGION]` | `[LINK/MECHANISM]` | `[SLA]` | PENDING |
| Transactional email | `[PROVIDER]` | Recipient, template payload and delivery metadata | `[REGION]` | `[LINK/MECHANISM]` | `[SLA]` | PENDING |
| Mobile push notification | `[PROVIDER]` | Device token and notification metadata | `[REGION]` | `[LINK/MECHANISM]` | `[SLA]` | PENDING |
| Payment processing | Razorpay or Stripe deployment selection | Billing contact, amount, token reference and transaction state | `[REGION]` | `[LINK/MECHANISM]` | Statutory/provider schedule | PENDING |
| Error monitoring and tracing | `[PROVIDER]` | Redacted diagnostics, route, release and request ID | `[REGION]` | `[LINK/MECHANISM]` | `[SLA]` | PENDING |
| Device integrity | `[PROVIDER]` | Challenge and device integrity assertion | `[REGION]` | `[LINK/MECHANISM]` | `[SLA]` | PENDING |
| Face/liveness verification | `[PROVIDER]` | Approved private evidence reference and verification result | `[GULF-APPROVED REGION]` | `[LINK/MECHANISM]` | `[SLA]` | PENDING |

No production biometric enforcement, payment collection, telemetry export or
customer notification delivery may be enabled until the corresponding active
row is approved and matches runtime configuration.
