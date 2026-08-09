# HRMS Data Extraction Readiness

## 1. Decision status

**Status:** Not approved for extraction or cutover  
**Source reviewed:** `apps/api/prisma/schema.prisma` on 2026-08-05  
**Phase 1 invariant:** No production row, table, object, partition or database is copied, changed, seeded, reset, truncated or deleted by this work.

This is the review specification for a later HRMS extraction. The current production database remains authoritative until a separately approved cutover runbook has passed backup restore, reconciliation, shadow-read and rollback drills. This document does not authorize a migration.

## 2. Ownership rules

- Platform retains tenant lifecycle, identity, membership, authentication, subscription, entitlement, localization governance, shared notification delivery and platform audit data.
- HRMS owns organization, workplace, attendance, leave and payroll business data.
- Stable Platform identifiers such as `tenantId`, `userId` and `membershipId` are referenced by HRMS; their Platform rows are not copied as product-owned records.
- Mixed tables are split through an explicit contract or projection. They are never copied wholesale merely because HRMS currently reads some columns.
- Every future copy is additive and tenant-scoped. Source rows remain untouched throughout cutover and the observation window.
- Object metadata and object bytes must be reconciled together. A database row count alone is not sufficient for documents, selfies, imports, reports or payslips.

## 3. Platform data that must not move

| Prisma model / physical table | Disposition | HRMS dependency after extraction |
|---|---|---|
| `Tenant` / `tenants` | Platform remains authoritative | Contract projection with immutable `tenantId`, status and workspace identity |
| `User` / `users` | Platform remains authoritative | Audience-specific token claims and user lookup contract; no HRMS identity-table query |
| `VerificationToken`, `RefreshToken`, `LoginAttempt` | Platform only | No product access |
| `Role`, `Permission`, `RolePermission`, `UserRole` | Platform identity/assignment remains authoritative | Product permissions arrive in token/entitlement claims; HRMS owns enforcement |
| `TenantBillingProfile`, `SubscriptionPlan`, `SubscriptionPlanModule` | Platform only | Effective entitlement contract |
| `TenantSubscription`, `TenantSubscriptionHistory` | Platform only | Effective entitlement contract and invalidation event |
| `Module`, `ModuleCapability`, `SubscriptionPlanCapability` | Platform only | Versioned HRMS manifest and entitlement contract |
| `TenantCapabilityOverride`, `TenantModule` | Platform only | Effective entitlement contract; never queried by HRMS |
| `TenantInvoice`, `TenantInvoiceLineItem`, `InvoiceSequence` | Platform only | No product database access |
| `PaymentTransaction`, `BillingPaymentMethod`, `BillingWebhookReceipt`, `DunningTransition` | Platform only | Subscription-state contract only |
| `PlatformUser`, `PlatformAuthChallenge`, `PlatformSession`, `PlatformRefreshToken` | Platform only | No product access |
| `PlatformMfaRecoveryCode`, `PlatformPermission`, `PlatformRolePermission` | Platform only | No product access |
| `ImpersonationSession`, `SystemAlert`, `SystemAuditLog` | Platform only | Approved audit summary/event contract |
| `LocalePack`, `LocalizationKey`, `LocaleTranslation` | Platform governance | Published locale catalog contract |
| `TenantLocalePolicy`, `TenantTranslationOverride` | Platform governance | Tenant locale policy/catalog contract |
| `NotificationTemplate`, `NotificationPreference`, `Notification`, `NotificationDelivery` | Platform delivery service | HRMS emits notification requests/events; it does not write these tables |
| `OutboxEvent` / `outbox_events` | Shared transitional infrastructure | Each future service owns its own outbox; existing rows remain with the source system |

## 4. Mixed records requiring an explicit split

| Prisma model / physical table | Platform-owned fields or records | HRMS-owned fields or records | Required extraction treatment |
|---|---|---|---|
| `TenantSettings` / `tenant_settings` | `timezone`, `locale`, `companyLogoKey`, onboarding progress/version | weekly-off, workday, attendance reminders, facial/field/regularization settings | Do not copy the row wholesale. Create versioned Platform tenant-profile and HRMS runtime-settings contracts, then backfill only HRMS fields into an HRMS settings row. Reconcile every field per tenant. |
| `TenantAuditLog` / `tenant_audit_logs` | Cross-product/platform summary and impersonation correlation | HRMS entity-level audit details for organization, attendance, leave and payroll | Copy only allowlisted HRMS module records. Platform retains summaries and immutable source audit rows. Reconcile counts by tenant/module/month plus first/last timestamps. |
| `Role`, `Permission`, `RolePermission`, `UserRole` | Membership and global role assignments | HRMS permission vocabulary and authorization decisions | Do not clone authorization tables. Register permission keys in the manifest and project effective claims into HRMS tokens. |
| `OutboxEvent` / `outbox_events` | Platform lifecycle events | HRMS domain events currently produced in the monolith | Drain/replay through event IDs. New HRMS service creates its own outbox; never transfer or delete source outbox rows. |

## 5. HRMS table-by-table future destination

The `Wave` column is an ordering constraint for a future copy, not permission to execute one. All count and checksum evidence is tenant-scoped.

### 5.1 Organization and workplace

| Wave | Prisma model / physical table | Future destination and dependency | Required reconciliation |
|---:|---|---|---|
| 1 | `Department` / `departments` | HRMS; preserve parent department IDs | Count; orphan parent check; deterministic row checksum |
| 1 | `Designation` / `designations` | HRMS | Count; uniqueness check; row checksum |
| 2 | `Employee` / `employees` | HRMS; retain Platform `userId` only as an external reference | Count by tenant/status; manager/department/designation orphan checks; checksum excluding timestamps |
| 3 | `EmployeeDocument` / `employee_documents` | HRMS metadata and HRMS object namespace | Row count; object `HEAD`; size/content-type/checksum; zero missing objects |
| 3 | `EmploymentEvent` / `employment_events` | HRMS append-only history | Count by event type; min/max effective date; payload checksum |
| 3 | `ImportJob` / `import_jobs` | HRMS job history and object namespace | Count/status totals; object checks; result totals |
| 4 | `RosterImportRow` / `roster_import_rows` | HRMS import detail | Count/status totals; import-job orphan check; checksum |
| 4 | `EmployeeImportRow` / `employee_import_rows` | HRMS import detail | Count/status totals; import/employee orphan checks; checksum |
| 1 | `OfficeLocation` / `office_locations` | HRMS workplace configuration | Count; coordinate/radius checksum; uniqueness check |
| 3 | `EmployeeOfficeAssignment` / `employee_office_assignments` | HRMS | Count; employee/office orphan checks; primary-office invariant |
| 1 | `AttendancePolicy` / `attendance_policies` | HRMS | Count; JSON canonical checksum; uniqueness check |
| 3 | `PolicyAssignment` / `policy_assignments` | HRMS | Count by scope; referenced policy/employee/department checks |
| 1 | `Shift` / `shifts` | HRMS | Count; start/end/overnight checksum |
| 3 | `EmployeeShiftRoster` / `employee_shift_rosters` | HRMS | Count by month; employee/shift orphan checks; uniqueness check |
| 1 | `TenantHoliday` / `tenant_holidays` | HRMS | Count by year/source; office orphan check; date/name checksum |

### 5.2 Attendance, security, field operations and leave

| Wave | Prisma model / physical table | Future destination and dependency | Required reconciliation |
|---:|---|---|---|
| 3 | `RegisteredDevice` / `registered_devices` | HRMS security domain; push tokens treated as sensitive | Count by status/platform; employee orphan check; masked checksum |
| 5 | `AttendanceLog` / `attendance_logs` | HRMS authoritative daily aggregate | Count/status totals by date; sum work/late/overtime/break minutes; employee/shift checks |
| 6 | `AttendanceEvent` / `attendance_events` | HRMS partitioned evidence | Count by partition/type/date; event uniqueness; aggregate checksum; partition coverage |
| 6 | `AttendanceVerificationLog` / `attendance_verification_logs` | HRMS partitioned sensitive evidence | Count by partition/status/type; no missing partitions; sensitive-field checksum under restricted procedure |
| 5 | `AttendanceException` / `attendance_exceptions` | HRMS | Count by type/source; date-range and leave-reference checks |
| 4 | `AttendanceJobRun` / `attendance_job_runs` | HRMS operational history | Count/status/attempt totals; idempotency-key uniqueness |
| 5 | `FieldTrackingSession` / `field_tracking_sessions` | HRMS field workforce | Count by status/date; employee/device reference checks |
| 6 | `FieldLocationPing` / `field_location_pings` | HRMS partitioned location evidence with retention preserved | Count by partition/day; min/max captured time; geo checksum; retention boundary |
| 6 | `FieldPingReceipt` / `field_ping_receipts` | HRMS ingestion receipts | Count/status totals; unique client ping; payload checksum |
| 6 | `FieldRouteSummary` / `field_route_summaries` | HRMS derived routes | Count by date; sum distance/ping/gap values; source-window checksum |
| 6 | `AttendanceSyncReceipt` / `attendance_sync_receipts` | HRMS offline idempotency receipts | Count/status totals; client-event uniqueness; payload/outcome checksum |
| 4 | `DeviceIntegrityChallenge` / `device_integrity_challenges` | Do not bulk-copy expired records; HRMS creates new challenges after cutover | Count active unconsumed challenges at freeze; verify all expire before cutover or explicitly invalidate |
| 5 | `RegularizationRequest` / `regularization_requests` | HRMS | Count/status totals; attendance/employee/event references; idempotency uniqueness |
| 4 | `BiometricConsent` / `biometric_consents` | HRMS restricted compliance store | Count by action/version; employee reference; immutable checksum |
| 4 | `FaceEnrollment` / `face_enrollments` | HRMS restricted metadata and private object namespace | Count/version/status; object and embedding reference checks; zero public exposure |
| 5 | `AlertRule` / `alert_rules` | HRMS security configuration | Count/type/status; canonical JSON checksum |
| 6 | `SecurityAlert` / `security_alerts` | HRMS security history | Count by status/type/severity; evidence/rule reference checks |
| 5 | `ReportExport` / `report_exports` | HRMS report metadata and object namespace | Count/status/type; source watermark; object size/checksum; payroll-lock references |
| 3 | `LeavePolicy` / `leave_policies` | HRMS leave configuration | Count/version/active totals; JSON checksum |
| 5 | `LeaveBalance` / `leave_balances` | HRMS financial-like balance state | Count; sum remaining days by policy; employee/policy checks |
| 6 | `LeaveBalanceLedger` / `leave_balance_ledger` | HRMS append-only balance history | Count/type totals; sum days; last balance equals current balance; idempotency uniqueness |
| 5 | `LeaveRequest` / `leave_requests` | HRMS | Count/status totals; sum total days; employee/policy/ledger/exception checks |

### 5.3 Payroll configuration and runtime

Payroll reconciliation is stricter than row counts. Every monetary amount is reconciled by tenant, currency, period and component, and every encrypted value is compared through an approved keyed digest without logging plaintext.

| Wave | Prisma model / physical table | Future destination | Required reconciliation |
|---:|---|---|---|
| 1 | `PayrollSettings` / `payroll_settings` | HRMS payroll configuration | One row per configured tenant; field checksum |
| 1 | `PayrollCalendar` / `payroll_calendars` | HRMS | Count/status/date range; settings reference |
| 1 | `PayGroup` / `pay_groups` | HRMS | Count/frequency/active totals; settings/calendar references |
| 3 | `PayGroupEmployeeAssignment` / `pay_group_employee_assignments` | HRMS | Count/effective-date coverage; employee/group references |
| 1 | `PayrollPolicy` / `payroll_policies` | HRMS | Count/active totals; uniqueness |
| 2 | `PayrollPolicyVersion` / `payroll_policy_versions` | HRMS immutable versions | Count/version ranges; canonical rule checksum |
| 1 | `PayComponent` / `pay_components` | HRMS | Count/type/taxability totals; uniqueness |
| 2 | `PayComponentVersion` / `pay_component_versions` | HRMS immutable versions | Count/version ranges; formula/rule checksum |
| 1 | `SalaryStructure` / `salary_structures` | HRMS | Count/active totals; uniqueness |
| 2 | `SalaryStructureVersion` / `salary_structure_versions` | HRMS immutable versions | Count/version ranges; effective-date checks |
| 3 | `SalaryStructureVersionComponent` / `salary_structure_version_components` | HRMS | Count; structure/component references; ordering/amount checksum |
| 3 | `EmployeePayrollProfile` / `employee_payroll_profiles` | HRMS restricted payroll profile | Count/status; employee/group/structure references |
| 4 | `EmployeeCompensationVersion` / `employee_compensation_versions` | HRMS restricted immutable compensation | Count/version ranges; currency totals; effective-date overlap check |
| 4 | `EmployeePaymentDetail` / `employee_payment_details` | HRMS encrypted restricted store | Count; employee reference; encryption metadata; keyed digest comparison only |
| 4 | `EmployeeStatutoryDetail` / `employee_statutory_details` | HRMS encrypted restricted store | Count; employee reference; encryption metadata; keyed digest comparison only |
| 1 | `PayrollApprovalPolicy` / `payroll_approval_policies` | HRMS | Count/active totals |
| 2 | `PayrollApprovalPolicyVersion` / `payroll_approval_policy_versions` | HRMS immutable versions | Count/version ranges; canonical approval-rule checksum |
| 2 | `PayrollAccountingMapping` / `payroll_accounting_mappings` | HRMS | Count; component/account uniqueness; checksum |
| 5 | `PayrollLockPeriod` / `payroll_lock_periods` | HRMS | Count/status by period; related log/export checks |
| 6 | `PayrollLockHistory` / `payroll_lock_history` | HRMS append-only history | Count/action totals; lock reference; temporal ordering |
| 5 | `PayrollRun` / `payroll_runs` | HRMS payroll runtime | Count/status by period/currency; gross/deduction/net/control totals |
| 6 | `PayrollRunEmployee` / `payroll_run_employees` | HRMS | Count/status; employee/run references; per-run monetary totals |
| 6 | `PayrollRunInput` / `payroll_run_inputs` | HRMS | Count/type/source; amount/quantity totals; run/employee references |
| 6 | `PayrollRunBlocker` / `payroll_run_blockers` | HRMS | Count/code/severity/status totals; run/employee references |
| 6 | `PayrollRunTimeline` / `payroll_run_timeline` | HRMS append-only audit | Count/action totals; run reference; temporal ordering |
| 5 | `PayrollInputImport` / `payroll_input_imports` | HRMS metadata and object namespace | Count/status totals; object size/checksum; result totals |
| 6 | `PayrollValidationRun` / `payroll_validation_runs` | HRMS | Count/status totals; payroll-run reference |
| 7 | `PayrollValidationIssue` / `payroll_validation_issues` | HRMS | Count/code/severity/status totals; validation/run/employee references |
| 7 | `PayrollEmployeeResult` / `payroll_employee_results` | HRMS final results | Count; gross/deduction/net totals by run/currency; employee references |
| 7 | `PayrollComponentResult` / `payroll_component_results` | HRMS final component results | Count; amount totals by run/component/currency; parent result references |
| 7 | `PayrollPayslip` / `payroll_payslips` | HRMS payslip metadata and private object namespace | Count/status; employee/run references; object size/checksum |
| 7 | `PayrollOutputExport` / `payroll_output_exports` | HRMS export metadata and object namespace | Count/status/type; run reference; object size/checksum |
| 7 | `PayrollPaymentBatch` / `payroll_payment_batches` | HRMS payment runtime | Count/status/currency; amount/control totals; object checksum if present |
| 5 | `PayrollJobRun` / `payroll_job_runs` | HRMS job history | Count/status/attempt totals; idempotency uniqueness |
| 1 | `PayrollCountryRulePack` / `payroll_country_rule_packs` | HRMS versioned compliance rules | Count/country/version/status; signed content checksum |

## 6. Future extraction procedure

No step may run against production until the named evidence is approved and stored with the release record.

1. **Restore proof:** Take an encrypted production backup and restore it into an isolated environment. Record backup identifier, checksum, restore duration, owner and successful application smoke tests.
2. **Read-only baseline:** Capture tenant-scoped counts, orphan checks, partition inventory, object inventory, financial totals and encrypted-value digests from the source. Store signed output; do not log sensitive plaintext.
3. **Forward-only target:** Create the HRMS database through reviewed forward-only migrations. No `db push`, seed, reset, truncate or destructive cleanup is permitted.
4. **Snapshot copy:** Copy tables in the waves above with bounded, resumable, idempotent jobs. Each batch records source watermark, tenant, table, first/last key, count and checksum.
5. **Change capture:** Replay approved HRMS outbox/CDC changes from the snapshot watermark. Consumers persist processed `eventId` values and tolerate duplicate delivery.
6. **Shadow validation:** Keep source reads authoritative while comparing destination responses and aggregates for the approved observation window. Personal data must be masked in comparison logs.
7. **Write freeze:** Freeze only HRMS writes for a short approved window, drain lag to zero and rerun all table/object/financial reconciliation.
8. **Route cutover:** Switch gateway routing to HRMS. Platform identity, entitlement, locale and navigation remain Platform contracts.
9. **Observation:** Monitor errors, tenant isolation, lag, result parity, payroll totals and object access. Source HRMS tables remain intact and read-only.
10. **Cleanup decision:** Source cleanup is a separate, delayed, explicitly approved project after the retention window. It is not part of extraction or rollback.

## 7. Reconciliation evidence template

For every physical table and every tenant, retain:

```text
release_id, tenant_id, source_table, destination_table, source_watermark,
source_count, destination_count, source_checksum, destination_checksum,
source_min_key, source_max_key, destination_min_key, destination_max_key,
financial_control_totals, object_count, object_checksum_failures,
orphan_count, compared_at, compared_by, result
```

Required global assertions:

- Every tenant present in an HRMS-owned source table exists in the Platform tenant contract.
- Every copied row has the same immutable primary key and `tenantId`.
- All orphan and cross-tenant reference checks equal zero.
- Source and destination row counts/checksums match at the final watermark.
- Payroll gross, deductions, employer contributions, net pay and payment batch totals match exactly by currency and period.
- Leave balance ledger endings match current balances.
- Attendance work, late, overtime, break and early-leave minute totals match by day.
- Referenced objects exist, have the expected size/content type and match the stored checksum.

## 8. Rollback procedure

Rollback is routing-based and non-destructive:

1. Stop destination writes and preserve the destination for investigation.
2. Route HRMS traffic back to the source monolith.
3. Replay destination-originated accepted writes back through an approved idempotent event path if any were allowed during observation.
4. Reconcile the source to the last accepted event watermark.
5. Re-enable source HRMS writes only after the source is authoritative and healthy.
6. Do not drop destination tables, delete source rows, reverse migrations or restore over the production source database.

## 9. Required approvals before repository extraction

| Approval | Required owner | Current evidence |
|---|---|---|
| Platform/HRMS ownership and mixed-table split | Platform and HRMS technical owners | Pending named human approval |
| Security classification and service/database credentials | Security owner | Pending |
| Backup restore drill | DBA/DevOps owner | Pending; no production command run in Phase 1 |
| Table/object/financial reconciliation queries | DBA, HRMS and Payroll owners | Specification complete; execution pending future cutover |
| Shadow-read duration and acceptable variance | Product and SRE owners | Pending |
| Cutover and rollback drill | SRE/DevOps owner | Pending |
| Separate `deltcrm-hrms` repository creation | Architecture owner | Not approved until all Phase 1 acceptance gates pass |

## 10. Review result

The extraction design is documented, but extraction remains **not approved**. The source database remains unchanged and authoritative. Creation of a separate `deltcrm-hrms` repository and any production data movement are deferred until contract publication, security, routing, isolation, backup restore, reconciliation, shadow-read and rollback evidence are approved.
