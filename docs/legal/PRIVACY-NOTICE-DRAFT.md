# DeltCRM Privacy Notice - Approval Draft

**Status:** DRAFT - not approved for publication  
**Required owners:** Product, privacy/legal, security and the deployment account owner  
**Publication URL:** `[PUBLIC_PRIVACY_URL]`  
**Effective date/version:** `[DATE]` / `[VERSION]`

This source document must be reviewed for the countries in which DeltCRM and
each customer operate. Replace every bracketed field before publication.

## Roles and contacts

The subscribing organization is normally the data controller for employee and
workforce data. `[DELTCRM_LEGAL_ENTITY]` acts as its processor and acts as a
controller for its own account, security, support and billing records where
applicable. Privacy requests may be sent to `[PRIVACY_EMAIL]`; security reports
may be sent to `[SECURITY_EMAIL]`. The controller remains the first contact for
employees exercising rights concerning employer-managed records.

## Data and purpose

| Data category | Purpose | Typical source |
|---|---|---|
| Account and employment profile | Authentication, organization structure and HR administration | Employer and user |
| Device and security signals | Device trust, fraud prevention, session security and diagnostics | Device and integrity provider |
| Attendance, shift and request records | Punching, timesheets, exceptions, leave and payroll preparation | User, employer and system |
| Precise/approximate location and IP | Tenant-selected office geofence or active field-work verification | Device and network |
| Selfie, liveness and face result | Tenant-selected identity verification for attendance | User and verification provider |
| Audit and support records | Security, compliance, troubleshooting and operator accountability | System and support staff |
| Billing and tax records | Subscription, payment reconciliation and GST invoicing | Customer and payment provider |
| Notifications and diagnostics | Operational messages, delivery, reliability and incident response | System and providers |

DeltCRM does not store raw card or bank credentials. The enabled payment
processor stores payment instruments and DeltCRM retains only token references,
transaction state and accounting evidence.

## Location, camera and biometric behavior

Permissions are policy-driven. The app requests camera access only when the
tenant enables selfie/face verification for the employee. It requests location
for office/geofence attendance only while needed. Background location is
requested only when field tracking is licensed, enabled by the tenant, assigned
to the employee and started for an active field session. Tracking stops at
check-out/session end and does not run merely because the employee is signed in.

Face enrollment requires a separate consent. DeltCRM stores private evidence in
restricted object storage and exposes it only through short-lived signed access.
`[LEGAL_OWNER]` must approve the biometric lawful basis/consent wording and any
cross-border processing before enforcement is enabled.

## Sharing and subprocessors

Data is shared only with authorized tenant users, DeltCRM personnel with a
support need, and approved infrastructure, notification, integrity, biometric,
observability and payment subprocessors. The deployment-specific list, purpose,
region and transfer mechanism is maintained in `SUBPROCESSOR-REGISTER.md` and
must be published at `[SUBPROCESSOR_URL]`.

## Retention and deletion

| Record | Engineering default | Final policy owner |
|---|---|---|
| Raw field-location pings | 90 days | Controller/privacy owner |
| Verification and integrity challenges | 7 days after expiry | Security/privacy owner |
| Notifications and delivery detail | Deployment-configured operational window | Controller/privacy owner |
| Attendance and employment records | Tenant policy and applicable labour law | Controller |
| Billing, invoice and tax records | Applicable statutory period | Finance/legal owner |
| Immutable security/audit records | Approved security/legal retention schedule | Security/legal owner |
| Private biometric evidence | Consent/policy window; purge on approved churn subject to legal hold | Controller/privacy owner |

Tenant deletion immediately suspends access and revokes sessions. The deletion
workflow anonymizes identities, purges eligible private biometric/location
evidence, and preserves records subject to tax, labour, security or legal-hold
requirements. Corporate employee accounts are employer-managed; employees may
request correction or deletion through their employer or `[PRIVACY_EMAIL]`.

## Rights, transfers and complaints

Subject to local law, people may request access, correction, deletion,
restriction, objection, portability or withdrawal of consent. Identity and
authorization are verified before a response. Cross-border transfers use
`[APPROVED_TRANSFER_MECHANISM]` and the approved hosting regions are
`[HOSTING_REGIONS]`. Complaints may be made to `[SUPERVISORY_AUTHORITY]`.

## Changes and incidents

Material changes receive a new version and notice through `[NOTICE_CHANNEL]`.
Confirmed incidents are handled under the DPA and applicable notification law;
the contractual notification contact and period are `[DPA_CONTACT_AND_PERIOD]`.

## Approval record

| Role | Name | Decision | Date |
|---|---|---|---|
| Product owner |  | PENDING |  |
| Privacy/legal |  | PENDING |  |
| Security |  | PENDING |  |
| Deployment account owner |  | PENDING |  |
