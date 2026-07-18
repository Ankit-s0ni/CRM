# DeltCRM Data Processing Addendum - Approval Draft

**Status:** DRAFT - requires legal approval and execution  
**Controller/customer:** `[CUSTOMER_LEGAL_NAME]`  
**Processor:** `[DELTCRM_LEGAL_ENTITY]`  
**Effective date:** `[DATE]`

This draft records the product's technical behavior for counsel to convert into
the governing agreement. It is not an executed contract.

## Processing instructions and scope

DeltCRM processes personal data only to provide the contracted CRM, workforce,
attendance, field-operation, notification, support and billing services, on the
controller's documented instructions and enabled module/policy configuration.
Processing covers collection, validation, storage, retrieval, transmission,
reporting, restriction, anonymization and deletion for the subscription term
plus the approved return/deletion period.

Data subjects include customer employees, contractors, administrators, support
contacts and billing contacts. Data categories are those listed in the privacy
notice, including sensitive precise location and biometric verification data
only when explicitly enabled and lawfully authorized by the controller.

## Processor obligations

- Restrict personnel access by role, support purpose, MFA and auditable sessions.
- Maintain confidentiality, secure-development, vulnerability, incident,
  continuity, backup, recovery, retention and deletion controls.
- Encrypt transport and managed storage; store payment tokens rather than raw
  payment credentials; keep biometric evidence in private object storage.
- Assist with data-subject requests, impact assessments, regulator inquiries and
  breach investigation to the extent applicable to the processing.
- Notify `[CUSTOMER_SECURITY_CONTACT]` of a confirmed personal-data breach
  without undue delay and within `[CONTRACTUAL_PERIOD]`, with available scope,
  impact, containment and remediation information.
- On termination, return or delete eligible data according to the controller's
  instruction, legal holds and the retention schedule, and provide deletion
  evidence for the automated churn workflow.

## Subprocessors and transfers

Approved subprocessors are recorded in `SUBPROCESSOR-REGISTER.md`. DeltCRM must
flow equivalent confidentiality, security, incident and deletion obligations to
each subprocessor and provide `[NOTICE_PERIOD]` notice of material changes.
Cross-border transfers require `[TRANSFER_MECHANISM]`, approved regions and any
supplementary measures identified by the transfer assessment.

## Security controls

The minimum technical schedule includes tenant isolation/RLS, separate platform
authority and database credentials, least privilege, MFA for platform staff,
short-lived scoped impersonation, tamper-resistant audit records, signed and
idempotent payment webhooks, transactional outbox delivery, private signed object
downloads, log/telemetry redaction, dependency/SBOM checks, monitored workers,
managed backups/PITR and tested recovery. Release evidence and the security
threat model identify controls still requiring environment certification.

## Audits and assurance

DeltCRM provides current security documentation and reasonable evidence of the
agreed controls subject to confidentiality. Independent penetration findings
rated critical/high must be closed before GA. Audit scope, frequency, notice,
cost and protection of other customers are `[AUDIT_TERMS]`.

## Liability, precedence and governing law

Counsel must insert liability, indemnity, agreement precedence, term,
termination, governing law and dispute provisions consistent with the master
service agreement and applicable data-protection law.

## Annex: processing configuration

| Item | Agreed value |
|---|---|
| Enabled modules | `[MODULES]` |
| Hosting/backup regions | `[REGIONS]` |
| Attendance/location policy | `[POLICY_REFERENCE]` |
| Biometric processing enabled | `[YES/NO + LAWFUL BASIS]` |
| Retention schedule | `[SCHEDULE_REFERENCE]` |
| Customer security/privacy contacts | `[CONTACTS]` |
| DeltCRM security/privacy contacts | `[CONTACTS]` |

## Execution

| Party | Authorized signatory | Signature | Date |
|---|---|---|---|
| Customer/controller |  | PENDING |  |
| DeltCRM/processor |  | PENDING |  |
