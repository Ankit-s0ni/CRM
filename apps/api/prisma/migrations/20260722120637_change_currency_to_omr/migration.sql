-- DropForeignKey
ALTER TABLE "attendance_events" DROP CONSTRAINT "attendance_events_regularization_request_fk";

-- DropForeignKey
ALTER TABLE "attendance_exceptions" DROP CONSTRAINT "attendance_exceptions_leaveRequestId_fkey";

-- DropForeignKey
ALTER TABLE "billing_payment_methods" DROP CONSTRAINT "billing_payment_methods_tenant_fk";

-- DropForeignKey
ALTER TABLE "dunning_transitions" DROP CONSTRAINT "dunning_transitions_subscription_fk";

-- DropForeignKey
ALTER TABLE "dunning_transitions" DROP CONSTRAINT "dunning_transitions_tenant_fk";

-- DropForeignKey
ALTER TABLE "employee_documents" DROP CONSTRAINT "employee_documents_employee_fk";

-- DropForeignKey
ALTER TABLE "leave_balance_ledger" DROP CONSTRAINT "leave_balance_ledger_balance_fk";

-- DropForeignKey
ALTER TABLE "leave_balance_ledger" DROP CONSTRAINT "leave_balance_ledger_request_fk";

-- DropForeignKey
ALTER TABLE "leave_balances" DROP CONSTRAINT "leave_balances_employee_fk";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_employee_fk";

-- DropForeignKey
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_user_fk";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_fk";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_tenant_fk";

-- DropForeignKey
ALTER TABLE "payroll_lock_history" DROP CONSTRAINT "payroll_lock_history_lock_fk";

-- DropForeignKey
ALTER TABLE "payroll_lock_periods" DROP CONSTRAINT "payroll_lock_periods_export_fk";

-- DropForeignKey
ALTER TABLE "regularization_requests" DROP CONSTRAINT "regularization_requests_attendance_log_fk";

-- DropForeignKey
ALTER TABLE "regularization_requests" DROP CONSTRAINT "regularization_requests_employee_fk";

-- DropForeignKey
ALTER TABLE "report_exports" DROP CONSTRAINT "report_exports_requester_fk";

-- DropForeignKey
ALTER TABLE "roster_import_rows" DROP CONSTRAINT "roster_import_rows_importJobId_fkey";

-- DropForeignKey
ALTER TABLE "subscription_plan_modules" DROP CONSTRAINT "subscription_plan_modules_module_fk";

-- DropForeignKey
ALTER TABLE "subscription_plan_modules" DROP CONSTRAINT "subscription_plan_modules_plan_fk";

-- DropForeignKey
ALTER TABLE "tenant_deletion_jobs" DROP CONSTRAINT "tenant_deletion_jobs_tenant_fk";

-- DropForeignKey
ALTER TABLE "tenant_invoice_line_items" DROP CONSTRAINT "tenant_invoice_line_items_invoice_fk";

-- DropForeignKey
ALTER TABLE "tenant_invoice_line_items" DROP CONSTRAINT "tenant_invoice_line_items_tenant_fk";

-- DropForeignKey
ALTER TABLE "tenant_invoices" DROP CONSTRAINT "tenant_invoices_tenant_fk";

-- DropForeignKey
ALTER TABLE "tenant_subscription_history" DROP CONSTRAINT "tenant_subscription_history_plan_fk";

-- DropForeignKey
ALTER TABLE "tenant_subscription_history" DROP CONSTRAINT "tenant_subscription_history_subscription_fk";

-- DropForeignKey
ALTER TABLE "tenant_subscription_history" DROP CONSTRAINT "tenant_subscription_history_tenant_fk";

-- DropForeignKey
ALTER TABLE "tenant_subscriptions" DROP CONSTRAINT "tenant_subscriptions_pending_plan_fk";

-- DropForeignKey
ALTER TABLE "tenant_subscriptions" DROP CONSTRAINT "tenant_subscriptions_tenant_fk";

-- DropIndex
DROP INDEX "attendance_exceptions_range_idx";

-- DropIndex
DROP INDEX "attendance_logs_employee_date_idx";

-- DropIndex
DROP INDEX "biometric_consents_tenantId_employeeId_idx";

-- DropIndex
DROP INDEX "payment_transactions_invoiceId_idx";

-- DropIndex
DROP INDEX "tenants_status_createdAt_idx";

-- AlterTable
ALTER TABLE "attendance_events" RENAME CONSTRAINT "attendance_events_pkey1" TO "attendance_events_pkey";

-- AlterTable
ALTER TABLE "attendance_exceptions" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "attendance_job_runs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "attendance_sync_receipts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "attendance_verification_logs" ADD CONSTRAINT "attendance_verification_logs_pkey" PRIMARY KEY ("id", "verifiedAt");

-- DropIndex
DROP INDEX "attendance_verification_logs_id_verifiedat_key";

-- AlterTable
ALTER TABLE "billing_payment_methods" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "billing_webhook_receipts" ALTER COLUMN "occurredAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "processedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "device_integrity_challenges" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "dunning_transitions" ALTER COLUMN "scheduledFor" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employee_documents" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_location_pings" ADD CONSTRAINT "field_location_pings_pkey" PRIMARY KEY ("id", "capturedAt");

-- DropIndex
DROP INDEX "field_location_pings_id_capturedat_key";

-- AlterTable
ALTER TABLE "field_ping_receipts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_route_summaries" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "field_tracking_sessions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoice_sequences" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leave_balances" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_policies" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "module_capabilities" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "modules" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_transactions" ALTER COLUMN "currency" SET DEFAULT 'OMR';

-- AlterTable
ALTER TABLE "roster_import_rows" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscription_plans" ALTER COLUMN "currency" SET DEFAULT 'OMR';

-- AlterTable
ALTER TABLE "system_alerts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_billing_profiles" ALTER COLUMN "currency" SET DEFAULT 'OMR';

-- AlterTable
ALTER TABLE "tenant_capability_overrides" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_deletion_jobs" ALTER COLUMN "legalHoldUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "biometricPurgedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_invoices" ALTER COLUMN "currency" SET DEFAULT 'OMR',
ALTER COLUMN "issuedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "paidAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_subscription_history" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_subscriptions" ALTER COLUMN "scheduledChangeAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tenants_status_createdAt_idx" ON "tenants"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "subscription_plan_modules" ADD CONSTRAINT "subscription_plan_modules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_modules" ADD CONSTRAINT "subscription_plan_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_history" ADD CONSTRAINT "tenant_subscription_history_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_history" ADD CONSTRAINT "tenant_subscription_history_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoice_line_items" ADD CONSTRAINT "tenant_invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_transitions" ADD CONSTRAINT "dunning_transitions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_deletion_jobs" ADD CONSTRAINT "tenant_deletion_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_import_rows" ADD CONSTRAINT "roster_import_rows_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shift_rosters" ADD CONSTRAINT "employee_shift_rosters_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_holidays" ADD CONSTRAINT "tenant_holidays_officeLocationId_fkey" FOREIGN KEY ("officeLocationId") REFERENCES "office_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lock_periods" ADD CONSTRAINT "payroll_lock_periods_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "report_exports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lock_history" ADD CONSTRAINT "payroll_lock_history_payrollLockId_fkey" FOREIGN KEY ("payrollLockId") REFERENCES "payroll_lock_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_attendanceLogId_fkey" FOREIGN KEY ("attendanceLogId") REFERENCES "attendance_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_regularizationRequestId_fkey" FOREIGN KEY ("regularizationRequestId") REFERENCES "regularization_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regularization_requests" ADD CONSTRAINT "regularization_requests_attendanceLogId_fkey" FOREIGN KEY ("attendanceLogId") REFERENCES "attendance_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regularization_requests" ADD CONSTRAINT "regularization_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_ledger" ADD CONSTRAINT "leave_balance_ledger_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "leave_balances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balance_ledger" ADD CONSTRAINT "leave_balance_ledger_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ae_client_uuid_uq" RENAME TO "attendance_events_tenantId_employeeId_clientEventUuid_event_key";

-- RenameIndex
ALTER INDEX "ae_tenant_emp_time_idx" RENAME TO "attendance_events_tenantId_employeeId_eventTime_idx";

-- RenameIndex
ALTER INDEX "attendance_events_regularization_request_idx" RENAME TO "attendance_events_tenantId_regularizationRequestId_idx";

-- RenameIndex
ALTER INDEX "attendance_job_runs_execution_idx" RENAME TO "attendance_job_runs_tenantId_jobType_attendanceDate_status_idx";

-- RenameIndex
ALTER INDEX "attendance_job_runs_idempotency_uq" RENAME TO "attendance_job_runs_tenantId_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "attendance_sync_receipts_employee_processed_idx" RENAME TO "attendance_sync_receipts_tenantId_employeeId_processedAt_idx";

-- RenameIndex
ALTER INDEX "attendance_sync_receipts_tenant_event_uq" RENAME TO "attendance_sync_receipts_tenantId_clientEventUuid_key";

-- RenameIndex
ALTER INDEX "attendance_verification_logs_tenantid_employeeid_verifiedat_idx" RENAME TO "attendance_verification_logs_tenantId_employeeId_verifiedAt_idx";

-- RenameIndex
ALTER INDEX "attendance_verification_logs_tenantid_verificationstatus_verifi" RENAME TO "attendance_verification_logs_tenantId_verificationStatus_ve_idx";

-- RenameIndex
ALTER INDEX "billing_payment_methods_provider_uq" RENAME TO "billing_payment_methods_gateway_providerMethodRef_key";

-- RenameIndex
ALTER INDEX "billing_payment_methods_tenant_status_idx" RENAME TO "billing_payment_methods_tenantId_status_idx";

-- RenameIndex
ALTER INDEX "billing_webhook_receipts_event_uq" RENAME TO "billing_webhook_receipts_provider_providerEventId_key";

-- RenameIndex
ALTER INDEX "billing_webhook_receipts_status_idx" RENAME TO "billing_webhook_receipts_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "biometric_consents_tenantid_employeeid_consentedat_idx" RENAME TO "biometric_consents_tenantId_employeeId_consentedAt_idx";

-- RenameIndex
ALTER INDEX "device_integrity_challenges_device_expiry_idx" RENAME TO "device_integrity_challenges_tenantId_deviceId_expiresAt_idx";

-- RenameIndex
ALTER INDEX "device_integrity_challenges_pending_idx" RENAME TO "device_integrity_challenges_tenantId_consumedAt_expiresAt_idx";

-- RenameIndex
ALTER INDEX "dunning_transitions_idempotency_uq" RENAME TO "dunning_transitions_tenantId_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "dunning_transitions_schedule_idx" RENAME TO "dunning_transitions_scheduledFor_completedAt_idx";

-- RenameIndex
ALTER INDEX "dunning_transitions_subscription_idx" RENAME TO "dunning_transitions_tenantId_subscriptionId_createdAt_idx";

-- RenameIndex
ALTER INDEX "employee_documents_employee_idx" RENAME TO "employee_documents_tenantId_employeeId_createdAt_idx";

-- RenameIndex
ALTER INDEX "employee_documents_type_idx" RENAME TO "employee_documents_tenantId_documentType_idx";

-- RenameIndex
ALTER INDEX "field_location_pings_employee_captured_idx" RENAME TO "field_location_pings_tenantId_employeeId_capturedAt_idx";

-- RenameIndex
ALTER INDEX "field_location_pings_session_captured_idx" RENAME TO "field_location_pings_tenantId_sessionId_capturedAt_idx";

-- RenameIndex
ALTER INDEX "field_ping_receipts_idempotency_uq" RENAME TO "field_ping_receipts_tenantId_deviceId_clientPingUuid_key";

-- RenameIndex
ALTER INDEX "field_ping_receipts_processing_idx" RENAME TO "field_ping_receipts_tenantId_sessionId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "field_tracking_sessions_device_active_idx" RENAME TO "field_tracking_sessions_tenantId_deviceId_endedAt_idx";

-- RenameIndex
ALTER INDEX "field_tracking_sessions_start_idempotency_uq" RENAME TO "field_tracking_sessions_tenantId_employeeId_clientStartUuid_key";

-- RenameIndex
ALTER INDEX "import_jobs_tenant_kind_idempotency_uq" RENAME TO "import_jobs_tenantId_kind_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "leave_balance_ledger_balance_idx" RENAME TO "leave_balance_ledger_tenantId_balanceId_createdAt_idx";

-- RenameIndex
ALTER INDEX "leave_balance_ledger_idempotency_unique" RENAME TO "leave_balance_ledger_tenantId_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "leave_requests_employee_range_idx" RENAME TO "leave_requests_tenantId_employeeId_startDate_endDate_idx";

-- RenameIndex
ALTER INDEX "notifications_dedupe_unique" RENAME TO "notifications_tenantId_userId_dedupeKey_key";

-- RenameIndex
ALTER INDEX "payment_transactions_gateway_ref_uq" RENAME TO "payment_transactions_gateway_gatewayRef_key";

-- RenameIndex
ALTER INDEX "payment_transactions_idempotency_uq" RENAME TO "payment_transactions_tenantId_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "payment_transactions_lookup_idx" RENAME TO "payment_transactions_tenantId_invoiceId_attemptedAt_idx";

-- RenameIndex
ALTER INDEX "payroll_lock_history_tenant_lock_idx" RENAME TO "payroll_lock_history_tenantId_payrollLockId_createdAt_idx";

-- RenameIndex
ALTER INDEX "regularization_requests_day_unique" RENAME TO "regularization_requests_tenantId_employeeId_attendanceLogId_key";

-- RenameIndex
ALTER INDEX "regularization_requests_idempotency_unique" RENAME TO "regularization_requests_tenantId_employeeId_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "report_exports_status_idx" RENAME TO "report_exports_tenantId_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "roster_import_rows_idempotency_uq" RENAME TO "roster_import_rows_tenantId_idempotencyKey_key";

-- RenameIndex
ALTER INDEX "roster_import_rows_job_row_uq" RENAME TO "roster_import_rows_tenantId_importJobId_rowNumber_key";

-- RenameIndex
ALTER INDEX "roster_import_rows_status_idx" RENAME TO "roster_import_rows_tenantId_importJobId_status_idx";

-- RenameIndex
ALTER INDEX "tenant_deletion_jobs_status_idx" RENAME TO "tenant_deletion_jobs_tenantId_status_idx";

-- RenameIndex
ALTER INDEX "tenant_invoice_line_items_lookup_idx" RENAME TO "tenant_invoice_line_items_tenantId_invoiceId_idx";

-- RenameIndex
ALTER INDEX "tenant_invoices_fiscal_sequence_uq" RENAME TO "tenant_invoices_fiscalYear_sequenceNumber_key";

-- RenameIndex
ALTER INDEX "tenant_subscription_history_lookup_idx" RENAME TO "tenant_subscription_history_tenantId_subscriptionId_created_idx";

-- RenameIndex
ALTER INDEX "tenant_subscription_history_source_uq" RENAME TO "tenant_subscription_history_tenantId_sourceEventId_key";
