-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DunningState" AS ENUM ('NONE', 'REMINDED', 'GRACE', 'SUSPEND_PENDING');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WebhookReceiptStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT', 'UPI', 'WALLET');

-- CreateEnum
CREATE TYPE "DunningAction" AS ENUM ('PAYMENT_FAILED', 'REMINDER_SENT', 'GRACE_STARTED', 'SUSPEND_SCHEDULED', 'TENANT_SUSPENDED', 'PAYMENT_RECOVERED', 'TENANT_REACTIVATED');

-- CreateEnum
CREATE TYPE "DeletionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'LEGAL_HOLD');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "LocaleDirection" AS ENUM ('LTR', 'RTL');

-- CreateEnum
CREATE TYPE "LocalizationStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ModuleAvailability" AS ENUM ('AVAILABLE', 'COMING_SOON', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ModuleKind" AS ENUM ('PRODUCT', 'ADD_ON');

-- CreateEnum
CREATE TYPE "TenantOverrideMode" AS ENUM ('INHERIT', 'ENABLE', 'DISABLE');

-- CreateEnum
CREATE TYPE "RegisteredProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProductManifestRevisionStatus" AS ENUM ('VALIDATED', 'ACTIVE', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductLifecycleMode" AS ENUM ('EVENT', 'HTTP');

-- CreateEnum
CREATE TYPE "ProductLimitUnit" AS ENUM ('COUNT', 'BYTES', 'GIGABYTES', 'MINUTES', 'REQUESTS');

-- CreateEnum
CREATE TYPE "ProductLimitEnforcement" AS ENUM ('HARD', 'SOFT', 'METERED');

-- CreateEnum
CREATE TYPE "ProductProvisioningState" AS ENUM ('NOT_REQUESTED', 'PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProductDeploymentHealth" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNHEALTHY', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "SystemAlertType" AS ENUM ('PAYMENT_GATEWAY_DOWN', 'QUEUE_LAG', 'PUSH_FAILURE', 'NEW_SUBSCRIPTION', 'PLAN_UPGRADED', 'TENANT_SUSPENDED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'USER_INVITE', 'TENANT_SIGNUP');

-- CreateEnum
CREATE TYPE "RevokeReason" AS ENUM ('LOGOUT', 'ROTATED', 'REUSE_DETECTED', 'ADMIN', 'PASSWORD_CHANGE');

-- CreateEnum
CREATE TYPE "LoginFailReason" AS ENUM ('BAD_PASSWORD', 'LOCKED', 'DISABLED', 'UNKNOWN_USER', 'MFA_FAILED');

-- CreateEnum
CREATE TYPE "NotifChannel" AS ENUM ('PUSH', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "companyLogo" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "suspendedByPlatformUserId" UUID,
    "onboardingIdempotencyKey" TEXT,
    "onboardingRequestHash" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenantId" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "onboardingVersion" INTEGER NOT NULL DEFAULT 1,
    "runtimeConfigVersion" INTEGER NOT NULL DEFAULT 1,
    "companyLogoKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "tenant_locale_policies" (
    "tenantId" UUID NOT NULL,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "regionalLocale" TEXT NOT NULL DEFAULT 'ar',
    "regionalOverrideReason" TEXT,
    "enabledLocales" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "allowUserPreference" BOOLEAN NOT NULL DEFAULT false,
    "allowTenantOverrides" BOOLEAN NOT NULL DEFAULT false,
    "catalogVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_locale_policies_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "tenant_translation_overrides" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "keyId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "status" "LocalizationStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedBy" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_translation_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locale_packs" (
    "id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "parentLocale" TEXT,
    "displayName" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "direction" "LocaleDirection" NOT NULL,
    "status" "LocalizationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locale_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localization_keys" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "defaultMessage" TEXT NOT NULL,
    "description" TEXT,
    "placeholderSchema" JSONB NOT NULL DEFAULT '{}',
    "isTenantEditable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localization_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locale_translations" (
    "localePackId" UUID NOT NULL,
    "keyId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "status" "LocalizationStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locale_translations_pkey" PRIMARY KEY ("localePackId","keyId")
);

-- CreateTable
CREATE TABLE "tenant_billing_profiles" (
    "tenantId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "address" JSONB,
    "gstin" TEXT,
    "pan" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_profiles_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerUser" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "maxEmployees" INTEGER NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registered_products" (
    "id" UUID NOT NULL,
    "productKey" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RegisteredProductStatus" NOT NULL DEFAULT 'DRAFT',
    "activeRevisionId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registered_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_manifest_revisions" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "manifestVersion" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "minimumContractVersion" TEXT,
    "manifest" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "signature" TEXT,
    "signingKeyId" TEXT,
    "status" "ProductManifestRevisionStatus" NOT NULL DEFAULT 'VALIDATED',
    "validationResult" JSONB NOT NULL,
    "registeredBy" UUID,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_manifest_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_permission_definitions" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "platformPermissionAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platformPermissionPrefixAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredCapabilityKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_permission_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_capability_definitions" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "dependencyKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conflictKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_capability_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_limit_definitions" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "unit" "ProductLimitUnit" NOT NULL,
    "enforcement" "ProductLimitEnforcement" NOT NULL,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_limit_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_event_definitions" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_event_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_deployments" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "environment" TEXT NOT NULL,
    "internalApiBaseUrl" TEXT NOT NULL,
    "internalWebBaseUrl" TEXT,
    "region" TEXT,
    "maintenance" BOOLEAN NOT NULL DEFAULT false,
    "health" "ProductDeploymentHealth" NOT NULL DEFAULT 'UNKNOWN',
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_service_credentials" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "environment" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "secretRef" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rotatedFromId" UUID,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_service_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_product_grants" (
    "planId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_product_grants_pkey" PRIMARY KEY ("planId","productId")
);

-- CreateTable
CREATE TABLE "plan_product_capability_grants" (
    "planId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "capabilityId" UUID NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_product_capability_grants_pkey" PRIMARY KEY ("planId","capabilityId")
);

-- CreateTable
CREATE TABLE "plan_product_limit_grants" (
    "planId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "limitId" UUID NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,

    CONSTRAINT "plan_product_limit_grants_pkey" PRIMARY KEY ("planId","limitId")
);

-- CreateTable
CREATE TABLE "tenant_product_overrides" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "mode" "TenantOverrideMode" NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "changedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tenant_product_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_product_capability_overrides" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "capabilityId" UUID NOT NULL,
    "mode" "TenantOverrideMode" NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "changedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tenant_product_capability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_product_limit_overrides" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "limitId" UUID NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "changedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tenant_product_limit_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "effective_tenant_product_entitlements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL,
    "capabilities" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "source" JSONB NOT NULL,
    "entitlementVersion" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectionVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "effective_tenant_product_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_provisioning_instances" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "state" "ProductProvisioningState" NOT NULL DEFAULT 'NOT_REQUESTED',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "lastEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_provisioning_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_lifecycle_deliveries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "correlationId" UUID NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_lifecycle_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_usage_snapshots" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,
    "entitlementVersion" INTEGER NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_registry_migration_ledger" (
    "id" UUID NOT NULL,
    "migrationKey" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "targetRecordId" TEXT,
    "sourceSnapshot" JSONB NOT NULL,
    "resultSnapshot" JSONB,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_registry_migration_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_modules" (
    "planId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,

    CONSTRAINT "subscription_plan_modules_pkey" PRIMARY KEY ("planId","moduleId")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "seatCount" INTEGER NOT NULL,
    "currentPeriodStart" DATE NOT NULL,
    "currentPeriodEnd" DATE NOT NULL,
    "dunningState" "DunningState" NOT NULL DEFAULT 'NONE',
    "provider" "PaymentGateway",
    "providerCustomerRef" TEXT,
    "providerSubscriptionRef" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pendingPlanId" UUID,
    "scheduledChangeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscription_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" UUID,
    "actorPlatformUserId" UUID,
    "sourceEventId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "availability" "ModuleAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "kind" "ModuleKind" NOT NULL DEFAULT 'PRODUCT',
    "parentModuleId" UUID,
    "catalogOrder" INTEGER NOT NULL DEFAULT 0,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "dependencyKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conflictKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_capabilities" (
    "id" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "availability" "ModuleAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "configurable" BOOLEAN NOT NULL DEFAULT true,
    "requiredModuleKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dependencyKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conflictKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_capabilities" (
    "planId" UUID NOT NULL,
    "capabilityId" UUID NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "limitValue" JSONB,

    CONSTRAINT "subscription_plan_capabilities_pkey" PRIMARY KEY ("planId","capabilityId")
);

-- CreateTable
CREATE TABLE "tenant_capability_overrides" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "capabilityId" UUID NOT NULL,
    "mode" "TenantOverrideMode" NOT NULL,
    "limitValue" JSONB,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "changedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_capability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_modules" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activatedBy" UUID,

    CONSTRAINT "tenant_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_invoices" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "dueDate" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "objectKey" TEXT,
    "pdfChecksum" TEXT,
    "billingSnapshot" JSONB NOT NULL,
    "taxSnapshot" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_invoice_line_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitAmount" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "tenant_invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "fiscalYear" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("fiscalYear")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayRef" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "providerEventId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payment_methods" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "providerMethodRef" TEXT NOT NULL,
    "methodType" "PaymentMethodType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "lastFour" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_webhook_receipts" (
    "id" UUID NOT NULL,
    "provider" "PaymentGateway" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "WebhookReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "normalizedEvent" JSONB,
    "outcome" JSONB,
    "failureCode" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dunning_transitions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "action" "DunningAction" NOT NULL,
    "fromState" "DunningState" NOT NULL,
    "toState" "DunningState" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dunning_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_deletion_jobs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "status" "DeletionJobStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" UUID,
    "reason" TEXT NOT NULL,
    "legalHoldUntil" TIMESTAMP(3),
    "biometricPurgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_deletion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_auth_challenges" (
    "id" UUID NOT NULL,
    "platformUserId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_sessions" (
    "id" UUID NOT NULL,
    "platformUserId" UUID NOT NULL,
    "mfaVerifiedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_refresh_tokens" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" "RevokeReason",
    "createdIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_mfa_recovery_codes" (
    "id" UUID NOT NULL,
    "platformUserId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_permissions" (
    "role" "PlatformRole" NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY ("role","permissionId")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" UUID NOT NULL,
    "platformUserId" UUID NOT NULL,
    "platformSessionId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "tokenJti" UUID NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedReason" TEXT,
    "endedByPlatformUserId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" UUID NOT NULL,
    "alertType" "SystemAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB,
    "tenantId" UUID,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "acknowledgedBy" UUID,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedNote" TEXT,
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_audit_logs" (
    "id" UUID NOT NULL,
    "actorPlatformUserId" UUID,
    "impersonationSessionId" UUID,
    "tenantId" UUID,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdIp" TEXT,
    "invitedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" UUID NOT NULL,
    "deviceId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" "RevokeReason",
    "createdIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" "LoginFailReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "channel" "NotifChannel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "requiredVariables" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "channel" "NotifChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "module" TEXT,
    "referenceType" TEXT,
    "referenceId" UUID,
    "actionUrl" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "providerRef" TEXT,
    "providerCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "deviceId" UUID,
    "nextAttemptAt" TIMESTAMP(3),
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "eventKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deadLetteredAt" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_onboardingIdempotencyKey_key" ON "tenants"("onboardingIdempotencyKey");

-- CreateIndex
CREATE INDEX "tenants_status_createdAt_idx" ON "tenants"("status", "createdAt");

-- CreateIndex
CREATE INDEX "tenant_translation_overrides_tenantId_locale_status_idx" ON "tenant_translation_overrides"("tenantId", "locale", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_translation_overrides_tenantId_locale_keyId_version_key" ON "tenant_translation_overrides"("tenantId", "locale", "keyId", "version");

-- CreateIndex
CREATE INDEX "locale_packs_locale_status_version_idx" ON "locale_packs"("locale", "status", "version");

-- CreateIndex
CREATE UNIQUE INDEX "locale_packs_locale_version_key" ON "locale_packs"("locale", "version");

-- CreateIndex
CREATE UNIQUE INDEX "localization_keys_key_key" ON "localization_keys"("key");

-- CreateIndex
CREATE INDEX "localization_keys_namespace_key_idx" ON "localization_keys"("namespace", "key");

-- CreateIndex
CREATE INDEX "locale_translations_keyId_status_idx" ON "locale_translations"("keyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "registered_products_productKey_key" ON "registered_products"("productKey");

-- CreateIndex
CREATE UNIQUE INDEX "registered_products_audience_key" ON "registered_products"("audience");

-- CreateIndex
CREATE UNIQUE INDEX "registered_products_activeRevisionId_key" ON "registered_products"("activeRevisionId");

-- CreateIndex
CREATE INDEX "registered_products_status_displayName_idx" ON "registered_products"("status", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "product_manifest_revisions_idempotencyKey_key" ON "product_manifest_revisions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "product_manifest_revisions_productId_status_registeredAt_idx" ON "product_manifest_revisions"("productId", "status", "registeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_manifest_revisions_productId_manifestVersion_key" ON "product_manifest_revisions"("productId", "manifestVersion");

-- CreateIndex
CREATE UNIQUE INDEX "product_manifest_revisions_productId_contentHash_key" ON "product_manifest_revisions"("productId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "product_permission_definitions_key_key" ON "product_permission_definitions"("key");

-- CreateIndex
CREATE INDEX "product_permission_definitions_productId_deprecated_idx" ON "product_permission_definitions"("productId", "deprecated");

-- CreateIndex
CREATE UNIQUE INDEX "product_capability_definitions_key_key" ON "product_capability_definitions"("key");

-- CreateIndex
CREATE INDEX "product_capability_definitions_productId_deprecated_idx" ON "product_capability_definitions"("productId", "deprecated");

-- CreateIndex
CREATE UNIQUE INDEX "product_limit_definitions_key_key" ON "product_limit_definitions"("key");

-- CreateIndex
CREATE INDEX "product_limit_definitions_productId_deprecated_idx" ON "product_limit_definitions"("productId", "deprecated");

-- CreateIndex
CREATE UNIQUE INDEX "product_event_definitions_productId_eventKey_direction_key" ON "product_event_definitions"("productId", "eventKey", "direction");

-- CreateIndex
CREATE INDEX "product_deployments_environment_health_idx" ON "product_deployments"("environment", "health");

-- CreateIndex
CREATE UNIQUE INDEX "product_deployments_productId_environment_key" ON "product_deployments"("productId", "environment");

-- CreateIndex
CREATE INDEX "product_service_credentials_productId_environment_state_idx" ON "product_service_credentials"("productId", "environment", "state");

-- CreateIndex
CREATE INDEX "product_service_credentials_expiresAt_idx" ON "product_service_credentials"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_service_credentials_productId_environment_keyId_key" ON "product_service_credentials"("productId", "environment", "keyId");

-- CreateIndex
CREATE INDEX "plan_product_capability_grants_productId_idx" ON "plan_product_capability_grants"("productId");

-- CreateIndex
CREATE INDEX "plan_product_limit_grants_productId_idx" ON "plan_product_limit_grants"("productId");

-- CreateIndex
CREATE INDEX "tenant_product_overrides_tenantId_mode_idx" ON "tenant_product_overrides"("tenantId", "mode");

-- CreateIndex
CREATE INDEX "tenant_product_overrides_endsAt_idx" ON "tenant_product_overrides"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_product_overrides_tenantId_productId_key" ON "tenant_product_overrides"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "tenant_product_capability_overrides_tenantId_productId_mode_idx" ON "tenant_product_capability_overrides"("tenantId", "productId", "mode");

-- CreateIndex
CREATE INDEX "tenant_product_capability_overrides_endsAt_idx" ON "tenant_product_capability_overrides"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_product_capability_overrides_tenantId_capabilityId_key" ON "tenant_product_capability_overrides"("tenantId", "capabilityId");

-- CreateIndex
CREATE INDEX "tenant_product_limit_overrides_tenantId_productId_idx" ON "tenant_product_limit_overrides"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "tenant_product_limit_overrides_endsAt_idx" ON "tenant_product_limit_overrides"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_product_limit_overrides_tenantId_limitId_key" ON "tenant_product_limit_overrides"("tenantId", "limitId");

-- CreateIndex
CREATE INDEX "effective_tenant_product_entitlements_tenantId_entitlementV_idx" ON "effective_tenant_product_entitlements"("tenantId", "entitlementVersion");

-- CreateIndex
CREATE UNIQUE INDEX "effective_tenant_product_entitlements_tenantId_productId_key" ON "effective_tenant_product_entitlements"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "product_provisioning_instances_state_updatedAt_idx" ON "product_provisioning_instances"("state", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_provisioning_instances_tenantId_productId_key" ON "product_provisioning_instances"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_lifecycle_deliveries_eventId_key" ON "product_lifecycle_deliveries"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "product_lifecycle_deliveries_idempotencyKey_key" ON "product_lifecycle_deliveries"("idempotencyKey");

-- CreateIndex
CREATE INDEX "product_lifecycle_deliveries_tenantId_productId_createdAt_idx" ON "product_lifecycle_deliveries"("tenantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "product_lifecycle_deliveries_publishedAt_deadLetteredAt_idx" ON "product_lifecycle_deliveries"("publishedAt", "deadLetteredAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_usage_snapshots_sourceEventId_key" ON "product_usage_snapshots"("sourceEventId");

-- CreateIndex
CREATE INDEX "product_usage_snapshots_tenantId_productId_metricKey_occurr_idx" ON "product_usage_snapshots"("tenantId", "productId", "metricKey", "occurredAt");

-- CreateIndex
CREATE INDEX "product_registry_migration_ledger_migrationKey_status_idx" ON "product_registry_migration_ledger"("migrationKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_registry_migration_ledger_migrationKey_sourceRecord_key" ON "product_registry_migration_ledger"("migrationKey", "sourceRecordId");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenantId_status_idx" ON "tenant_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_subscription_history_tenantId_subscriptionId_created_idx" ON "tenant_subscription_history"("tenantId", "subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscription_history_tenantId_sourceEventId_key" ON "tenant_subscription_history"("tenantId", "sourceEventId");

-- CreateIndex
CREATE UNIQUE INDEX "modules_key_key" ON "modules"("key");

-- CreateIndex
CREATE INDEX "modules_kind_availability_catalogOrder_idx" ON "modules"("kind", "availability", "catalogOrder");

-- CreateIndex
CREATE INDEX "modules_parentModuleId_idx" ON "modules"("parentModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "module_capabilities_key_key" ON "module_capabilities"("key");

-- CreateIndex
CREATE INDEX "module_capabilities_moduleId_availability_displayOrder_idx" ON "module_capabilities"("moduleId", "availability", "displayOrder");

-- CreateIndex
CREATE INDEX "tenant_capability_overrides_tenantId_mode_idx" ON "tenant_capability_overrides"("tenantId", "mode");

-- CreateIndex
CREATE INDEX "tenant_capability_overrides_endsAt_idx" ON "tenant_capability_overrides"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_capability_overrides_tenantId_capabilityId_key" ON "tenant_capability_overrides"("tenantId", "capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_modules_tenantId_moduleId_key" ON "tenant_modules"("tenantId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invoices_invoiceNumber_key" ON "tenant_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "tenant_invoices_tenantId_status_idx" ON "tenant_invoices"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invoices_fiscalYear_sequenceNumber_key" ON "tenant_invoices"("fiscalYear", "sequenceNumber");

-- CreateIndex
CREATE INDEX "tenant_invoice_line_items_tenantId_invoiceId_idx" ON "tenant_invoice_line_items"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "payment_transactions_tenantId_invoiceId_attemptedAt_idx" ON "payment_transactions"("tenantId", "invoiceId", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gateway_gatewayRef_key" ON "payment_transactions"("gateway", "gatewayRef");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_tenantId_idempotencyKey_key" ON "payment_transactions"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "billing_payment_methods_tenantId_status_idx" ON "billing_payment_methods"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payment_methods_gateway_providerMethodRef_key" ON "billing_payment_methods"("gateway", "providerMethodRef");

-- CreateIndex
CREATE INDEX "billing_webhook_receipts_status_createdAt_idx" ON "billing_webhook_receipts"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_receipts_provider_providerEventId_key" ON "billing_webhook_receipts"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "dunning_transitions_tenantId_subscriptionId_createdAt_idx" ON "dunning_transitions"("tenantId", "subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "dunning_transitions_scheduledFor_completedAt_idx" ON "dunning_transitions"("scheduledFor", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "dunning_transitions_tenantId_idempotencyKey_key" ON "dunning_transitions"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "tenant_deletion_jobs_tenantId_status_idx" ON "tenant_deletion_jobs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_auth_challenges_tokenHash_key" ON "platform_auth_challenges"("tokenHash");

-- CreateIndex
CREATE INDEX "platform_auth_challenges_platformUserId_expiresAt_idx" ON "platform_auth_challenges"("platformUserId", "expiresAt");

-- CreateIndex
CREATE INDEX "platform_sessions_platformUserId_revokedAt_expiresAt_idx" ON "platform_sessions"("platformUserId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_refresh_tokens_tokenHash_key" ON "platform_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "platform_refresh_tokens_sessionId_familyId_revokedAt_idx" ON "platform_refresh_tokens"("sessionId", "familyId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_mfa_recovery_codes_codeHash_key" ON "platform_mfa_recovery_codes"("codeHash");

-- CreateIndex
CREATE INDEX "platform_mfa_recovery_codes_platformUserId_usedAt_idx" ON "platform_mfa_recovery_codes"("platformUserId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_permissions_key_key" ON "platform_permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "impersonation_sessions_tokenJti_key" ON "impersonation_sessions"("tokenJti");

-- CreateIndex
CREATE INDEX "impersonation_sessions_tenantId_startedAt_idx" ON "impersonation_sessions"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "impersonation_sessions_platformUserId_endedAt_expiresAt_idx" ON "impersonation_sessions"("platformUserId", "endedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "impersonation_sessions_targetUserId_endedAt_expiresAt_idx" ON "impersonation_sessions"("targetUserId", "endedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "system_alerts_status_severity_createdAt_idx" ON "system_alerts"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "system_audit_logs_actorPlatformUserId_createdAt_idx" ON "system_audit_logs"("actorPlatformUserId", "createdAt");

-- CreateIndex
CREATE INDEX "system_audit_logs_tenantId_createdAt_idx" ON "system_audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "system_audit_logs_module_createdAt_idx" ON "system_audit_logs"("module", "createdAt");

-- CreateIndex
CREATE INDEX "system_audit_logs_action_createdAt_idx" ON "system_audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "verification_tokens_email_purpose_idx" ON "verification_tokens"("email", "purpose");

-- CreateIndex
CREATE INDEX "verification_tokens_tokenHash_idx" ON "verification_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE INDEX "login_attempts_tenantId_email_createdAt_idx" ON "login_attempts"("tenantId", "email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_eventKey_channel_locale_key" ON "notification_templates"("eventKey", "channel", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenantId_userId_eventKey_channel_key" ON "notification_preferences"("tenantId", "userId", "eventKey", "channel");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_isRead_createdAt_idx" ON "notifications"("tenantId", "userId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_tenantId_userId_dedupeKey_key" ON "notifications"("tenantId", "userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "outbox_events_delivery_idx" ON "outbox_events"("publishedAt", "deadLetteredAt", "availableAt", "createdAt");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_locale_policies" ADD CONSTRAINT "tenant_locale_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_translation_overrides" ADD CONSTRAINT "tenant_translation_overrides_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_translation_overrides" ADD CONSTRAINT "tenant_translation_overrides_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "localization_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locale_translations" ADD CONSTRAINT "locale_translations_localePackId_fkey" FOREIGN KEY ("localePackId") REFERENCES "locale_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locale_translations" ADD CONSTRAINT "locale_translations_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "localization_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_billing_profiles" ADD CONSTRAINT "tenant_billing_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registered_products" ADD CONSTRAINT "registered_products_activeRevisionId_fkey" FOREIGN KEY ("activeRevisionId") REFERENCES "product_manifest_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_manifest_revisions" ADD CONSTRAINT "product_manifest_revisions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_permission_definitions" ADD CONSTRAINT "product_permission_definitions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_capability_definitions" ADD CONSTRAINT "product_capability_definitions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_limit_definitions" ADD CONSTRAINT "product_limit_definitions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_event_definitions" ADD CONSTRAINT "product_event_definitions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_deployments" ADD CONSTRAINT "product_deployments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_service_credentials" ADD CONSTRAINT "product_service_credentials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_grants" ADD CONSTRAINT "plan_product_grants_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_grants" ADD CONSTRAINT "plan_product_grants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_capability_grants" ADD CONSTRAINT "plan_product_capability_grants_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_capability_grants" ADD CONSTRAINT "plan_product_capability_grants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_capability_grants" ADD CONSTRAINT "plan_product_capability_grants_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "product_capability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_limit_grants" ADD CONSTRAINT "plan_product_limit_grants_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_limit_grants" ADD CONSTRAINT "plan_product_limit_grants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_product_limit_grants" ADD CONSTRAINT "plan_product_limit_grants_limitId_fkey" FOREIGN KEY ("limitId") REFERENCES "product_limit_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_overrides" ADD CONSTRAINT "tenant_product_overrides_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_capability_overrides" ADD CONSTRAINT "tenant_product_capability_overrides_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_capability_overrides" ADD CONSTRAINT "tenant_product_capability_overrides_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "product_capability_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_limit_overrides" ADD CONSTRAINT "tenant_product_limit_overrides_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_limit_overrides" ADD CONSTRAINT "tenant_product_limit_overrides_limitId_fkey" FOREIGN KEY ("limitId") REFERENCES "product_limit_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effective_tenant_product_entitlements" ADD CONSTRAINT "effective_tenant_product_entitlements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_provisioning_instances" ADD CONSTRAINT "product_provisioning_instances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_lifecycle_deliveries" ADD CONSTRAINT "product_lifecycle_deliveries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_usage_snapshots" ADD CONSTRAINT "product_usage_snapshots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "registered_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_modules" ADD CONSTRAINT "subscription_plan_modules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_modules" ADD CONSTRAINT "subscription_plan_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_history" ADD CONSTRAINT "tenant_subscription_history_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_history" ADD CONSTRAINT "tenant_subscription_history_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_parentModuleId_fkey" FOREIGN KEY ("parentModuleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_capabilities" ADD CONSTRAINT "module_capabilities_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_capabilities" ADD CONSTRAINT "subscription_plan_capabilities_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_capabilities" ADD CONSTRAINT "subscription_plan_capabilities_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "module_capabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_capability_overrides" ADD CONSTRAINT "tenant_capability_overrides_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "module_capabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoice_line_items" ADD CONSTRAINT "tenant_invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payment_methods" ADD CONSTRAINT "billing_payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_transitions" ADD CONSTRAINT "dunning_transitions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_deletion_jobs" ADD CONSTRAINT "tenant_deletion_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_auth_challenges" ADD CONSTRAINT "platform_auth_challenges_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_refresh_tokens" ADD CONSTRAINT "platform_refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "platform_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_mfa_recovery_codes" ADD CONSTRAINT "platform_mfa_recovery_codes_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_permissions" ADD CONSTRAINT "platform_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "platform_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_platformSessionId_fkey" FOREIGN KEY ("platformSessionId") REFERENCES "platform_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
