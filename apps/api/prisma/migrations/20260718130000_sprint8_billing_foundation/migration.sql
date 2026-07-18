-- Sprint 8 billing, revenue operations, dunning, and deletion evidence.

CREATE TYPE "WebhookReceiptStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'UPI', 'WALLET');
CREATE TYPE "DunningAction" AS ENUM (
  'PAYMENT_FAILED', 'REMINDER_SENT', 'GRACE_STARTED', 'SUSPEND_SCHEDULED',
  'TENANT_SUSPENDED', 'PAYMENT_RECOVERED', 'TENANT_REACTIVATED'
);
CREATE TYPE "DeletionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'LEGAL_HOLD');

ALTER TABLE subscription_plans
  ADD COLUMN description TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE subscription_plan_modules (
  "planId" UUID NOT NULL,
  "moduleId" UUID NOT NULL,
  PRIMARY KEY ("planId", "moduleId"),
  CONSTRAINT subscription_plan_modules_plan_fk
    FOREIGN KEY ("planId") REFERENCES subscription_plans(id) ON DELETE CASCADE,
  CONSTRAINT subscription_plan_modules_module_fk
    FOREIGN KEY ("moduleId") REFERENCES modules(id) ON DELETE RESTRICT
);

ALTER TABLE tenant_subscriptions
  ADD COLUMN provider "PaymentGateway",
  ADD COLUMN "providerCustomerRef" TEXT,
  ADD COLUMN "providerSubscriptionRef" TEXT,
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD CONSTRAINT tenant_subscriptions_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS tenant_subscriptions_one_current_uq;
CREATE UNIQUE INDEX tenant_subscriptions_one_current_uq
  ON tenant_subscriptions ("tenantId")
  WHERE status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

CREATE TABLE tenant_subscription_history (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  status "SubscriptionStatus" NOT NULL,
  "seatCount" INTEGER NOT NULL,
  reason TEXT NOT NULL,
  "actorUserId" UUID,
  "actorPlatformUserId" UUID,
  "sourceEventId" TEXT,
  snapshot JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenant_subscription_history_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT tenant_subscription_history_subscription_fk
    FOREIGN KEY ("subscriptionId") REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT tenant_subscription_history_plan_fk
    FOREIGN KEY ("planId") REFERENCES subscription_plans(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX tenant_subscription_history_source_uq
  ON tenant_subscription_history ("tenantId", "sourceEventId");
CREATE INDEX tenant_subscription_history_lookup_idx
  ON tenant_subscription_history ("tenantId", "subscriptionId", "createdAt");

ALTER TABLE tenant_invoices
  ADD COLUMN "fiscalYear" TEXT,
  ADD COLUMN "sequenceNumber" INTEGER,
  ADD COLUMN "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "objectKey" TEXT,
  ADD COLUMN "pdfChecksum" TEXT,
  ADD COLUMN "billingSnapshot" JSONB,
  ADD COLUMN "taxSnapshot" JSONB,
  ADD COLUMN "issuedAt" TIMESTAMPTZ,
  ADD COLUMN "paidAt" TIMESTAMPTZ,
  ADD CONSTRAINT tenant_invoices_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT;

WITH ranked AS (
  SELECT id,
    CASE
      WHEN EXTRACT(MONTH FROM "createdAt") >= 4
        THEN 'FY' || EXTRACT(YEAR FROM "createdAt")::int || '-' || RIGHT((EXTRACT(YEAR FROM "createdAt")::int + 1)::text, 2)
      ELSE 'FY' || (EXTRACT(YEAR FROM "createdAt")::int - 1) || '-' || RIGHT(EXTRACT(YEAR FROM "createdAt")::int::text, 2)
    END AS fiscal_year,
    ROW_NUMBER() OVER (PARTITION BY
      CASE
        WHEN EXTRACT(MONTH FROM "createdAt") >= 4 THEN EXTRACT(YEAR FROM "createdAt")::int
        ELSE EXTRACT(YEAR FROM "createdAt")::int - 1
      END
      ORDER BY "createdAt", id
    )::int AS sequence_number
  FROM tenant_invoices
)
UPDATE tenant_invoices invoice
SET "fiscalYear" = ranked.fiscal_year,
    "sequenceNumber" = ranked.sequence_number,
    "subtotalAmount" = invoice."amountDue",
    "billingSnapshot" = jsonb_build_object('migrated', true, 'currency', invoice.currency),
    "taxSnapshot" = jsonb_build_object('migrated', true, 'taxAmount', invoice."taxAmount")
FROM ranked
WHERE invoice.id = ranked.id;

ALTER TABLE tenant_invoices
  ALTER COLUMN "fiscalYear" SET NOT NULL,
  ALTER COLUMN "sequenceNumber" SET NOT NULL,
  ALTER COLUMN "billingSnapshot" SET NOT NULL,
  ALTER COLUMN "taxSnapshot" SET NOT NULL;
CREATE UNIQUE INDEX tenant_invoices_fiscal_sequence_uq
  ON tenant_invoices ("fiscalYear", "sequenceNumber");

CREATE TABLE tenant_invoice_line_items (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  "unitAmount" DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  metadata JSONB,
  CONSTRAINT tenant_invoice_line_items_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT tenant_invoice_line_items_invoice_fk
    FOREIGN KEY ("invoiceId") REFERENCES tenant_invoices(id) ON DELETE CASCADE
);
CREATE INDEX tenant_invoice_line_items_lookup_idx
  ON tenant_invoice_line_items ("tenantId", "invoiceId");

CREATE TABLE invoice_sequences (
  "fiscalYear" TEXT PRIMARY KEY,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO invoice_sequences ("fiscalYear", "lastNumber")
SELECT "fiscalYear", MAX("sequenceNumber")
FROM tenant_invoices
GROUP BY "fiscalYear"
ON CONFLICT ("fiscalYear") DO UPDATE
SET "lastNumber" = GREATEST(invoice_sequences."lastNumber", EXCLUDED."lastNumber");

ALTER TABLE payment_transactions
  ADD COLUMN "tenantId" UUID,
  ADD COLUMN "providerEventId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN metadata JSONB;
UPDATE payment_transactions transaction
SET "tenantId" = invoice."tenantId"
FROM tenant_invoices invoice
WHERE transaction."invoiceId" = invoice.id;
ALTER TABLE payment_transactions
  ALTER COLUMN "tenantId" SET NOT NULL,
  ADD CONSTRAINT payment_transactions_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT;
DROP INDEX IF EXISTS payment_transactions_invoiceId_idx;
CREATE UNIQUE INDEX payment_transactions_gateway_ref_uq
  ON payment_transactions (gateway, "gatewayRef");
CREATE UNIQUE INDEX payment_transactions_idempotency_uq
  ON payment_transactions ("tenantId", "idempotencyKey");
CREATE INDEX payment_transactions_lookup_idx
  ON payment_transactions ("tenantId", "invoiceId", "attemptedAt");

CREATE TABLE billing_payment_methods (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  gateway "PaymentGateway" NOT NULL,
  "providerMethodRef" TEXT NOT NULL,
  "methodType" "PaymentMethodType" NOT NULL,
  "displayName" TEXT NOT NULL,
  "lastFour" TEXT,
  "expiryMonth" INTEGER,
  "expiryYear" INTEGER,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  status "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT billing_payment_methods_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT billing_payment_methods_expiry_month_ck
    CHECK ("expiryMonth" IS NULL OR "expiryMonth" BETWEEN 1 AND 12),
  CONSTRAINT billing_payment_methods_last_four_ck
    CHECK ("lastFour" IS NULL OR "lastFour" ~ '^[0-9]{4}$')
);
CREATE UNIQUE INDEX billing_payment_methods_provider_uq
  ON billing_payment_methods (gateway, "providerMethodRef");
CREATE UNIQUE INDEX billing_payment_methods_one_default_uq
  ON billing_payment_methods ("tenantId")
  WHERE "isDefault" = TRUE AND status = 'ACTIVE';
CREATE INDEX billing_payment_methods_tenant_status_idx
  ON billing_payment_methods ("tenantId", status);

CREATE TABLE billing_webhook_receipts (
  id UUID PRIMARY KEY,
  provider "PaymentGateway" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ NOT NULL,
  "payloadHash" TEXT NOT NULL,
  status "WebhookReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "normalizedEvent" JSONB,
  outcome JSONB,
  "failureCode" TEXT,
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX billing_webhook_receipts_event_uq
  ON billing_webhook_receipts (provider, "providerEventId");
CREATE INDEX billing_webhook_receipts_status_idx
  ON billing_webhook_receipts (status, "createdAt");

CREATE TABLE dunning_transitions (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  action "DunningAction" NOT NULL,
  "fromState" "DunningState" NOT NULL,
  "toState" "DunningState" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  reason TEXT NOT NULL,
  "scheduledFor" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dunning_transitions_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT dunning_transitions_subscription_fk
    FOREIGN KEY ("subscriptionId") REFERENCES tenant_subscriptions(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX dunning_transitions_idempotency_uq
  ON dunning_transitions ("tenantId", "idempotencyKey");
CREATE INDEX dunning_transitions_subscription_idx
  ON dunning_transitions ("tenantId", "subscriptionId", "createdAt");
CREATE INDEX dunning_transitions_schedule_idx
  ON dunning_transitions ("scheduledFor", "completedAt");

CREATE TABLE tenant_deletion_jobs (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  status "DeletionJobStatus" NOT NULL DEFAULT 'PENDING',
  "requestedBy" UUID,
  reason TEXT NOT NULL,
  "legalHoldUntil" TIMESTAMPTZ,
  "biometricPurgedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "failureCode" TEXT,
  evidence JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenant_deletion_jobs_tenant_fk
    FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE RESTRICT
);
CREATE INDEX tenant_deletion_jobs_status_idx
  ON tenant_deletion_jobs ("tenantId", status);

DO $$
DECLARE
  table_name text;
  tenant_tables text[] := ARRAY[
    'tenant_subscriptions', 'tenant_subscription_history', 'tenant_invoices',
    'tenant_invoice_line_items', 'payment_transactions', 'billing_payment_methods',
    'dunning_transitions', 'tenant_deletion_jobs'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_user USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
    EXECUTE format('CREATE POLICY platform_access ON %I TO platform_runtime USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  tenant_subscriptions, tenant_subscription_history, tenant_invoices,
  tenant_invoice_line_items, payment_transactions, billing_payment_methods,
  dunning_transitions, tenant_deletion_jobs
TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  subscription_plan_modules, tenant_subscriptions, tenant_subscription_history,
  tenant_invoices, tenant_invoice_line_items, invoice_sequences,
  payment_transactions, billing_payment_methods, billing_webhook_receipts,
  dunning_transitions, tenant_deletion_jobs
TO platform_runtime;
