# Biometric Data Protection Checkpoint

**Scope:** Sprint 5 attendance face enrollment and punch verification
**Owner:** Privacy/Security owner and product owner
**Status:** Engineering controls implemented; local legal review is required before production activation

## Purpose and Data Boundaries

Face processing is used only when a tenant attendance policy explicitly requires face verification. The application stores tenant-scoped private object keys and provider embedding references; public URLs, raw provider tokens, integrity payloads, face scores, and observed IP addresses are excluded from general API serializers and application logs.

Private evidence uses the path `private/{tenantId}/{purpose}/{employeeId}/...`. Upload URLs expire after 5 minutes and forensic read URLs expire after 60 seconds. Signed reads require `attendance.security-alerts.read` and are audited through the security-alert workflow.

## Consent and Withdrawal

- Consent is explicit, versioned, and records server-observed time, IP, and user agent.
- A changed policy version requires fresh consent.
- Withdrawal immediately makes the employee ineligible for face verification.
- Withdrawal revokes active face enrollments, clears the employee selfie/embedding references, appends consent and deletion outbox events, and deletes the private enrollment image.
- A tenant requiring face verification must provide an approved non-biometric attendance route or HR exception after withdrawal. The system must not silently treat missing consent as a passed face check.

## Retention Schedule

| Record | Default checkpoint | Deletion/anonymization action |
| --- | --- | --- |
| Enrollment image and embedding reference | Active consent and employment only | Delete and clear references on withdrawal or approved erasure |
| Punch selfie evidence | 30 days after attendance finalization | Delete private object; retain verification result without image key |
| Verification log | 24 months, subject to local labor law | Remove private evidence key and sensitive network/provider fields before archival |
| Consent history | Required legal/audit period | Retain policy version and timestamps; restrict IP/UA access |
| Security alert | 24 months after closure | Retain decision/audit metadata; remove expired evidence links |

Retention values are deployment defaults, not legal conclusions. Oman and each operating Gulf jurisdiction must be reviewed before production rollout, including cross-border processing and biometric-data requirements.

## Operational Controls

- Private buckets deny public access and use encryption at rest and TLS in transit.
- Production provider credentials are stored in the deployment secret manager, never source control.
- Access to evidence follows least privilege and is reviewed quarterly.
- Deletion events are idempotent and must be monitored until acknowledged by the storage worker.
- Backups must inherit the approved retention period and expire deleted biometric material through backup lifecycle policies.
- A failed provider, missing consent, or unavailable evidence always fails closed.

## Production Approval Checklist

- [ ] Legal basis and employee notice approved per operating country.
- [ ] DPA/vendor terms and data residency approved for storage and face/liveness providers.
- [ ] Tenant-configurable retention worker and deletion-event monitoring enabled.
- [ ] Data-subject access, correction, withdrawal, and erasure runbooks tested.
- [ ] Encryption, bucket lifecycle, backup expiry, access review, and incident response verified.
- [ ] Non-biometric alternative/exception workflow approved for employees who withdraw or cannot enroll.

