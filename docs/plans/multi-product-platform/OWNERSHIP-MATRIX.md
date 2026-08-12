rced ctocconeop

# DeltCRM Platform + HRMS — Phase 0 Ownership Matrix

**Status:** Approved
**Date:** 2026-08-10
**Rule:** Every persisted entity, public route, event, queue, and object-storage prefix has exactly one owning service.

---

## 1. Table Ownership Matrix

### Platform-Owned Tables

| Model                      | Table                          | Owner    | Notes                                                    |
| -------------------------- | ------------------------------ | -------- | -------------------------------------------------------- |
| Tenant                     | tenants                        | PLATFORM | Root identity — HRMS stores`tenantId` as external ref |
| TenantBillingProfile       | tenant_billing_profiles        | PLATFORM |                                                          |
| TenantSettings             | tenant_settings                | PLATFORM |                                                          |
| TenantLocalePolicy         | tenant_locale_policies         | PLATFORM |                                                          |
| TenantTranslationOverride  | tenant_translation_overrides   | PLATFORM |                                                          |
| TenantDeletionJob          | tenant_deletion_jobs           | PLATFORM |                                                          |
| TenantModule               | tenant_modules                 | PLATFORM |                                                          |
| SubscriptionPlan           | subscription_plans             | PLATFORM |                                                          |
| SubscriptionPlanModule     | subscription_plan_modules      | PLATFORM |                                                          |
| SubscriptionPlanCapability | subscription_plan_capabilities | PLATFORM |                                                          |
| TenantSubscription         | tenant_subscriptions           | PLATFORM |                                                          |
| TenantSubscriptionHistory  | tenant_subscription_history    | PLATFORM |                                                          |
| TenantCapabilityOverride   | tenant_capability_overrides    | PLATFORM |                                                          |
| Module                     | modules                        | PLATFORM |                                                          |
| ModuleCapability           | module_capabilities            | PLATFORM |                                                          |
| TenantInvoice              | tenant_invoices                | PLATFORM |                                                          |
| TenantInvoiceLineItem      | tenant_invoice_line_items      | PLATFORM |                                                          |
| InvoiceSequence            | invoice_sequences              | PLATFORM |                                                          |
| PaymentTransaction         | payment_transactions           | PLATFORM |                                                          |
| BillingPaymentMethod       | billing_payment_methods        | PLATFORM |                                                          |
| BillingWebhookReceipt      | billing_webhook_receipts       | PLATFORM |                                                          |
| DunningTransition          | dunning_transitions            | PLATFORM |                                                          |
| PlatformUser               | platform_users                 | PLATFORM | Super-admin identity                                     |
| PlatformAuthChallenge      | platform_auth_challenges       | PLATFORM |                                                          |
| PlatformSession            | platform_sessions              | PLATFORM |                                                          |
| PlatformRefreshToken       | platform_refresh_tokens        | PLATFORM |                                                          |
| PlatformMfaRecoveryCode    | platform_mfa_recovery_codes    | PLATFORM |                                                          |
| PlatformPermission         | platform_permissions           | PLATFORM |                                                          |
| PlatformRolePermission     | platform_role_permissions      | PLATFORM |                                                          |
| ImpersonationSession       | impersonation_sessions         | PLATFORM |                                                          |
| User                       | users                          | PLATFORM | Tenant workspace user identity                           |
| VerificationToken          | verification_tokens            | PLATFORM |                                                          |
| Role                       | roles                          | PLATFORM |                                                          |
| Permission                 | permissions                    | PLATFORM |                                                          |
| RolePermission             | role_permissions               | PLATFORM |                                                          |
| UserRole                   | user_roles                     | PLATFORM |                                                          |
| RefreshToken               | refresh_tokens                 | PLATFORM |                                                          |
| LoginAttempt               | login_attempts                 | PLATFORM |                                                          |
| SystemAlert                | system_alerts                  | PLATFORM |                                                          |
| SystemAuditLog             | system_audit_logs              | PLATFORM |                                                          |
| LocalePack                 | locale_packs                   | PLATFORM |                                                          |
| LocalizationKey            | localization_keys              | PLATFORM |                                                          |
| LocaleTranslation          | locale_translations            | PLATFORM |                                                          |
| TenantAuditLog             | tenant_audit_logs              | PLATFORM | Cross-product audit log written by Platform              |
| NotificationTemplate       | notification_templates         | PLATFORM |                                                          |
| AlertRule                  | alert_rules                    | PLATFORM | Platform ops alerts                                      |
| SecurityAlert              | security_alerts                | PLATFORM | Auth/session security alerts                             |
| NotificationPreference     | notification_preferences       | PLATFORM |                                                          |
| Notification               | notifications                  | PLATFORM | Platform-level notifications                             |
| NotificationDelivery       | notification_deliveries        | PLATFORM |                                                          |
| OutboxEvent                | outbox_events                  | PLATFORM | Platform outbox; HRMS has its own outbox in HRMS DB      |

### HRMS-Owned Tables

| Model                           | Table                               | Owner | Notes                                                 |
| ------------------------------- | ----------------------------------- | ----- | ----------------------------------------------------- |
| Department                      | departments                         | HRMS  | `tenantId` is an external ref, no FK to Platform DB |
| Designation                     | designations                        | HRMS  |                                                       |
| Employee                        | employees                           | HRMS  | `userId` stored as external ref                     |
| EmployeeDocument                | employee_documents                  | HRMS  |                                                       |
| EmploymentEvent                 | employment_events                   | HRMS  |                                                       |
| OfficeLocation                  | office_locations                    | HRMS  |                                                       |
| EmployeeOfficeAssignment        | employee_office_assignments         | HRMS  |                                                       |
| AttendancePolicy                | attendance_policies                 | HRMS  |                                                       |
| PolicyAssignment                | policy_assignments                  | HRMS  |                                                       |
| Shift                           | shifts                              | HRMS  |                                                       |
| EmployeeShiftRoster             | employee_shift_rosters              | HRMS  |                                                       |
| TenantHoliday                   | tenant_holidays                     | HRMS  |                                                       |
| RegisteredDevice                | registered_devices                  | HRMS  |                                                       |
| AttendanceLog                   | attendance_logs                     | HRMS  |                                                       |
| AttendanceEvent                 | attendance_events                   | HRMS  |                                                       |
| AttendanceVerificationLog       | attendance_verification_logs        | HRMS  |                                                       |
| AttendanceException             | attendance_exceptions               | HRMS  |                                                       |
| AttendanceJobRun                | attendance_job_runs                 | HRMS  |                                                       |
| FieldTrackingSession            | field_tracking_sessions             | HRMS  |                                                       |
| FieldLocationPing               | field_location_pings                | HRMS  |                                                       |
| FieldPingReceipt                | field_ping_receipts                 | HRMS  |                                                       |
| FieldRouteSummary               | field_route_summaries               | HRMS  |                                                       |
| AttendanceSyncReceipt           | attendance_sync_receipts            | HRMS  |                                                       |
| DeviceIntegrityChallenge        | device_integrity_challenges         | HRMS  |                                                       |
| RegularizationRequest           | regularization_requests             | HRMS  |                                                       |
| BiometricConsent                | biometric_consents                  | HRMS  |                                                       |
| FaceEnrollment                  | face_enrollments                    | HRMS  |                                                       |
| LeavePolicy                     | leave_policies                      | HRMS  |                                                       |
| LeaveBalance                    | leave_balances                      | HRMS  |                                                       |
| LeaveBalanceLedger              | leave_balance_ledgers               | HRMS  |                                                       |
| LeaveRequest                    | leave_requests                      | HRMS  |                                                       |
| PayrollLockPeriod               | payroll_lock_periods                | HRMS  |                                                       |
| PayrollLockHistory              | payroll_lock_histories              | HRMS  |                                                       |
| PayrollSettings                 | payroll_settings                    | HRMS  |                                                       |
| PayrollCalendar                 | payroll_calendars                   | HRMS  |                                                       |
| PayGroup                        | pay_groups                          | HRMS  |                                                       |
| PayGroupEmployeeAssignment      | pay_group_employee_assignments      | HRMS  |                                                       |
| PayrollPolicy                   | payroll_policies                    | HRMS  |                                                       |
| PayrollPolicyVersion            | payroll_policy_versions             | HRMS  |                                                       |
| PayComponent                    | pay_components                      | HRMS  |                                                       |
| PayComponentVersion             | pay_component_versions              | HRMS  |                                                       |
| SalaryStructure                 | salary_structures                   | HRMS  |                                                       |
| SalaryStructureVersion          | salary_structure_versions           | HRMS  |                                                       |
| SalaryStructureVersionComponent | salary_structure_version_components | HRMS  |                                                       |
| EmployeePayrollProfile          | employee_payroll_profiles           | HRMS  |                                                       |
| EmployeeCompensationVersion     | employee_compensation_versions      | HRMS  |                                                       |
| EmployeePaymentDetail           | employee_payment_details            | HRMS  |                                                       |
| EmployeeStatutoryDetail         | employee_statutory_details          | HRMS  |                                                       |
| PayrollApprovalPolicy           | payroll_approval_policies           | HRMS  |                                                       |
| PayrollApprovalPolicyVersion    | payroll_approval_policy_versions    | HRMS  |                                                       |
| PayrollAccountingMapping        | payroll_accounting_mappings         | HRMS  |                                                       |
| PayrollRun                      | payroll_runs                        | HRMS  |                                                       |
| PayrollRunEmployee              | payroll_run_employees               | HRMS  |                                                       |
| PayrollRunInput                 | payroll_run_inputs                  | HRMS  |                                                       |
| PayrollRunBlocker               | payroll_run_blockers                | HRMS  |                                                       |
| PayrollRunTimeline              | payroll_run_timelines               | HRMS  |                                                       |
| PayrollInputImport              | payroll_input_imports               | HRMS  |                                                       |
| PayrollValidationRun            | payroll_validation_runs             | HRMS  |                                                       |
| PayrollValidationIssue          | payroll_validation_issues           | HRMS  |                                                       |
| PayrollEmployeeResult           | payroll_employee_results            | HRMS  |                                                       |
| PayrollComponentResult          | payroll_component_results           | HRMS  |                                                       |
| PayrollPayslip                  | payroll_payslips                    | HRMS  |                                                       |
| PayrollOutputExport             | payroll_output_exports              | HRMS  |                                                       |
| PayrollPaymentBatch             | payroll_payment_batches             | HRMS  |                                                       |
| PayrollJobRun                   | payroll_job_runs                    | HRMS  |                                                       |
| PayrollCountryRulePack          | payroll_country_rule_packs          | HRMS  |                                                       |
| ImportJob                       | import_jobs                         | HRMS  |                                                       |
| RosterImportRow                 | roster_import_rows                  | HRMS  |                                                       |
| EmployeeImportRow               | employee_import_rows                | HRMS  |                                                       |
| ReportExport                    | report_exports                      | HRMS  |                                                       |

---

## 2. Enum Ownership Matrix

### Platform-Owned Enums

| Enum                 | Owner    |
| -------------------- | -------- |
| TenantStatus         | PLATFORM |
| SubscriptionStatus   | PLATFORM |
| DunningState         | PLATFORM |
| InvoiceStatus        | PLATFORM |
| PaymentGateway       | PLATFORM |
| PaymentStatus        | PLATFORM |
| WebhookReceiptStatus | PLATFORM |
| PaymentMethodStatus  | PLATFORM |
| PaymentMethodType    | PLATFORM |
| DunningAction        | PLATFORM |
| DeletionJobStatus    | PLATFORM |
| BillingPeriod        | PLATFORM |
| PlatformRole         | PLATFORM |
| LocaleDirection      | PLATFORM |
| LocalizationStatus   | PLATFORM |
| ModuleAvailability   | PLATFORM |
| ModuleKind           | PLATFORM |
| TenantOverrideMode   | PLATFORM |
| SystemAlertType      | PLATFORM |
| AlertSeverity        | PLATFORM |
| AlertStatus          | PLATFORM |
| UserStatus           | PLATFORM |
| TokenPurpose         | PLATFORM |
| RevokeReason         | PLATFORM |
| LoginFailReason      | PLATFORM |
| NotifChannel         | PLATFORM |
| DeliveryChannel      | PLATFORM |
| DeliveryStatus       | PLATFORM |
| AlertRuleType        | PLATFORM |
| SecurityAlertType    | PLATFORM |

### HRMS-Owned Enums

| Enum                           | Owner |
| ------------------------------ | ----- |
| PayrollModuleStatus            | HRMS  |
| PayrollFrequency               | HRMS  |
| PayrollRecordStatus            | HRMS  |
| PayrollVersionStatus           | HRMS  |
| PayrollRunStatus               | HRMS  |
| PayrollCalculationResultStatus | HRMS  |
| PayrollOutputKind              | HRMS  |
| PayrollOutputStatus            | HRMS  |
| PayrollPaymentStatus           | HRMS  |
| PayrollCountryPackStatus       | HRMS  |
| PayrollJobKind                 | HRMS  |
| PayrollRunBlockerSeverity      | HRMS  |
| PayrollInputImportStatus       | HRMS  |
| PayrollValidationIssueStatus   | HRMS  |
| PayrollInputKind               | HRMS  |
| PayrollPolicyCategory          | HRMS  |
| PayrollPolicySourceLevel       | HRMS  |
| PayComponentType               | HRMS  |
| PayComponentValueMode          | HRMS  |
| PayrollPaymentMethod           | HRMS  |
| EmployeePayrollStatus          | HRMS  |
| PayrollProtectedDetailStatus   | HRMS  |
| WorkType                       | HRMS  |
| EmployeeStatus                 | HRMS  |
| EmploymentEventType            | HRMS  |
| ImportKind                     | HRMS  |
| JobStatus                      | HRMS  |
| ImportRowStatus                | HRMS  |
| DevicePlatform                 | HRMS  |
| DeviceStatus                   | HRMS  |
| FaceEnrollmentStatus           | HRMS  |
| BiometricConsentAction         | HRMS  |
| AttendanceStatus               | HRMS  |
| EventType                      | HRMS  |
| PunchSource                    | HRMS  |
| VerificationType               | HRMS  |
| VerificationStatus             | HRMS  |
| LocationMethod                 | HRMS  |
| AttendanceLocationMode         | HRMS  |
| SelfieMode                     | HRMS  |
| ExceptionType                  | HRMS  |
| ExceptionSource                | HRMS  |
| RequestStatus                  | HRMS  |
| PolicyScope                    | HRMS  |
| TrackingEndReason              | HRMS  |
| FieldIngestionStatus           | HRMS  |
| AttendanceSyncStatus           | HRMS  |
| LockStatus                     | HRMS  |
| ReportType                     | HRMS  |
| ReportFormat                   | HRMS  |
| PayrollLockAction              | HRMS  |
| LeaveBalanceEntryType          | HRMS  |
| HolidaySource                  | HRMS  |

---

## 3. API Route Ownership Matrix

### Platform API Routes (`http://localhost:4011`)

| Path prefix                | Owner    |
| -------------------------- | -------- |
| `/auth/*`                | PLATFORM |
| `/platform/*`            | PLATFORM |
| `/tenants/*`             | PLATFORM |
| `/users/*`               | PLATFORM |
| `/roles/*`               | PLATFORM |
| `/permissions/*`         | PLATFORM |
| `/subscriptions/*`       | PLATFORM |
| `/billing/*`             | PLATFORM |
| `/modules/*`             | PLATFORM |
| `/locale/*`              | PLATFORM |
| `/localization/*`        | PLATFORM |
| `/system/*`              | PLATFORM |
| `/notifications/*`       | PLATFORM |
| `/workspace/*`           | PLATFORM |
| `/product-integration/*` | PLATFORM |

### HRMS API Routes (`http://localhost:4012`)

| Path prefix              | Owner |
| ------------------------ | ----- |
| `/hrms/organization/*` | HRMS  |
| `/hrms/employees/*`    | HRMS  |
| `/hrms/attendance/*`   | HRMS  |
| `/hrms/leave/*`        | HRMS  |
| `/hrms/shifts/*`       | HRMS  |
| `/hrms/devices/*`      | HRMS  |
| `/hrms/payroll/*`      | HRMS  |
| `/hrms/reports/*`      | HRMS  |
| `/hrms/imports/*`      | HRMS  |
| `/hrms/documents/*`    | HRMS  |

---

## 4. Event / Queue Ownership Matrix

| Event                            | Producer | Consumer           | Transport       |
| -------------------------------- | -------- | ------------------ | --------------- |
| `tenant.created`               | PLATFORM | HRMS               | Outbox → Queue |
| `tenant.updated`               | PLATFORM | HRMS               | Outbox → Queue |
| `tenant.suspended`             | PLATFORM | HRMS               | Outbox → Queue |
| `tenant.reactivated`           | PLATFORM | HRMS               | Outbox → Queue |
| `tenant.deleted`               | PLATFORM | HRMS               | Outbox → Queue |
| `user.created`                 | PLATFORM | HRMS               | Outbox → Queue |
| `user.updated`                 | PLATFORM | HRMS               | Outbox → Queue |
| `user.suspended`               | PLATFORM | HRMS               | Outbox → Queue |
| `user.deleted`                 | PLATFORM | HRMS               | Outbox → Queue |
| `role.assigned`                | PLATFORM | HRMS               | Outbox → Queue |
| `role.revoked`                 | PLATFORM | HRMS               | Outbox → Queue |
| `entitlement.changed`          | PLATFORM | HRMS               | Outbox → Queue |
| `subscription.changed`         | PLATFORM | HRMS               | Outbox → Queue |
| `hrms.employee.created`        | HRMS     | PLATFORM (webhook) | Outbox → Queue |
| `hrms.employee.status_changed` | HRMS     | PLATFORM (webhook) | Outbox → Queue |
| `hrms.payroll.run.completed`   | HRMS     | None (internal)    | Internal        |

---

## 5. Object-Storage Prefix Ownership Matrix

| Prefix                 | Owner    | Notes                                   |
| ---------------------- | -------- | --------------------------------------- |
| `platform/`          | PLATFORM | Tenant logos, branding assets           |
| `platform/invoices/` | PLATFORM | Invoice PDFs                            |
| `hrms/employees/`    | HRMS     | Employee profile photos, documents      |
| `hrms/attendance/`   | HRMS     | Selfie evidence, geofence snapshots     |
| `hrms/payroll/`      | HRMS     | Payslips, bank files, statutory exports |
| `hrms/imports/`      | HRMS     | Import CSV/XLSX uploads                 |
| `hrms/reports/`      | HRMS     | Generated report exports                |
| `hrms/faces/`        | HRMS     | Biometric face enrollment data          |

---

## 6. Scheduled Job Ownership Matrix

| Job                          | Owner    | Notes             |
| ---------------------------- | -------- | ----------------- |
| Dunning state machine        | PLATFORM | Billing lifecycle |
| Tenant deletion sweep        | PLATFORM |                   |
| Token expiry cleanup         | PLATFORM |                   |
| Localization pack publish    | PLATFORM |                   |
| Attendance daily computation | HRMS     |                   |
| Attendance sync from devices | HRMS     |                   |
| Leave balance accrual        | HRMS     |                   |
| Payroll run scheduler        | HRMS     |                   |
| Payroll validation runner    | HRMS     |                   |
| Report export generator      | HRMS     |                   |

---

## 7. Authoritative ID Definitions

| Entity         | Authoritative ID          | Created by | Stored in HRMS as                  |
| -------------- | ------------------------- | ---------- | ---------------------------------- |
| Tenant         | `Tenant.id` (UUID)      | Platform   | `tenantId` (external ref, no FK) |
| Workspace User | `User.id` (UUID)        | Platform   | `userId` (external ref, no FK)   |
| Product        | Module slug (string)      | Platform   | Read from contract package         |
| Subscription   | `TenantSubscription.id` | Platform   | Not stored in HRMS directly        |
| Entitlement    | Capability slug           | Platform   | Validated via JWT claims           |
| Employee       | `Employee.id` (UUID)    | HRMS       | Authoritative in HRMS              |
| Attendance Log | `AttendanceLog.id`      | HRMS       | Authoritative in HRMS              |
| Payroll Run    | `PayrollRun.id`         | HRMS       | Authoritative in HRMS              |

---

## Boundary Rules (Non-Negotiable)

1. **No cross-database foreign keys.** HRMS stores `tenantId` and `userId` as plain UUID columns — not Prisma `@relation` fields pointing to Platform tables.
2. **No shared Prisma client.** Platform generates its own Prisma client from the Platform-only schema. HRMS generates its own from the HRMS-only schema.
3. **No shared application code imports.** HRMS may only import from `deltcrm-product-contracts`.
4. **All cross-service communication goes through versioned APIs or signed events** defined in the contract package.
