-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DunningState" AS ENUM ('NONE', 'REMINDED', 'GRACE', 'SUSPEND_PENDING');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');

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
CREATE TYPE "RevokeReason" AS ENUM ('LOGOUT', 'REUSE_DETECTED', 'ADMIN', 'PASSWORD_CHANGE');

-- CreateEnum
CREATE TYPE "LoginFailReason" AS ENUM ('BAD_PASSWORD', 'LOCKED', 'DISABLED', 'UNKNOWN_USER', 'MFA_FAILED');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('OFFICE', 'FIELD', 'HYBRID');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_NOTICE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "EmploymentEventType" AS ENUM ('JOINED', 'TRANSFERRED', 'PROMOTED', 'EXITED');

-- CreateEnum
CREATE TYPE "ImportKind" AS ENUM ('EMPLOYEES', 'ROSTERS');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'BLOCKED', 'REPLACED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT_OPEN', 'PRESENT', 'HALF_DAY', 'ABSENT', 'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF', 'ON_DUTY');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CHECKIN', 'CHECKOUT', 'BREAK_START', 'BREAK_END', 'REGULARIZED_CHECKIN', 'REGULARIZED_CHECKOUT');

-- CreateEnum
CREATE TYPE "PunchSource" AS ENUM ('MOBILE', 'WEB', 'KIOSK', 'REGULARIZED');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('CHECKIN', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "LocationMethod" AS ENUM ('GEOFENCE', 'OFFICE_IP', 'GPS_ONLY', 'NONE');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('ON_DUTY', 'LEAVE', 'WFH', 'OTHER');

-- CreateEnum
CREATE TYPE "ExceptionSource" AS ENUM ('MANUAL', 'LEAVE_MODULE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PolicyScope" AS ENUM ('TENANT_DEFAULT', 'DEPARTMENT', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "TrackingEndReason" AS ENUM ('CHECKOUT', 'MANUAL', 'BATTERY', 'STALE');

-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('OPEN', 'LOCKED', 'REOPENED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('MUSTER', 'PAYROLL', 'LATE_OT', 'VIOLATIONS', 'FIELD_DISTANCE');

-- CreateEnum
CREATE TYPE "NotifChannel" AS ENUM ('PUSH', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "AlertRuleType" AS ENUM ('ABSENTEE_AFTER_GRACE', 'LATE_ARRIVAL', 'MISSED_CHECKOUT', 'GEOFENCE_VIOLATION', 'FACE_MISMATCH', 'MOCK_LOCATION', 'DEVICE_VIOLATION', 'CLOCK_TAMPER', 'QUOTA_THRESHOLD', 'OFFLINE_SYNC_STALE');

-- CreateEnum
CREATE TYPE "SecurityAlertType" AS ENUM ('GEOFENCE_VIOLATION', 'FACE_MISMATCH', 'MOCK_LOCATION', 'ROOTED_DEVICE', 'UNREGISTERED_DEVICE', 'CLOCK_TAMPER', 'ABSENTEE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "companyLogo" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_billing_profiles" (
    "tenantId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "address" JSONB,
    "gstin" TEXT,
    "pan" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_profiles_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerUser" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "maxEmployees" INTEGER NOT NULL,
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
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
    "amountDue" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDate" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayRef" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" UUID NOT NULL,
    "platformUserId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
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
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_audit_logs" (
    "id" UUID NOT NULL,
    "actorPlatformUserId" UUID,
    "impersonationSessionId" UUID,
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
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "parentDeptId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "workType" "WorkType" NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateOfJoining" DATE NOT NULL,
    "dateOfExit" DATE,
    "managerId" UUID,
    "deptId" UUID NOT NULL,
    "designationId" UUID,
    "userId" UUID,
    "defaultShiftId" UUID,
    "masterSelfie" TEXT,
    "faceEmbeddingRef" TEXT,
    "faceEnrolledAt" TIMESTAMP(3),
    "faceEnrolledBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "eventType" "EmploymentEventType" NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "payload" JSONB,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestedBy" UUID NOT NULL,
    "kind" "ImportKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "rowErrors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenantId" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "weeklyOffs" JSONB NOT NULL DEFAULT '["SAT","SUN"]',
    "requireFacialRecognition" BOOLEAN NOT NULL DEFAULT false,
    "faceMatchThreshold" INTEGER NOT NULL DEFAULT 85,
    "fieldTrackingIntervalMin" INTEGER NOT NULL DEFAULT 15,
    "checkinReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "checkoutReminderMinutes" INTEGER NOT NULL DEFAULT 15,
    "absenteeAlertTime" TEXT NOT NULL DEFAULT '10:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "office_locations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "officeName" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "timezone" TEXT,
    "egressIps" JSONB NOT NULL DEFAULT '[]',
    "wifiSsids" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_office_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "officeLocationId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employee_office_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "lateAfterMinutes" INTEGER NOT NULL DEFAULT 15,
    "halfDayAfterMinutes" INTEGER NOT NULL DEFAULT 240,
    "minimumWorkMinutes" INTEGER NOT NULL DEFAULT 480,
    "overtimeAfterMinutes" INTEGER NOT NULL DEFAULT 540,
    "allowEarlyCheckin" BOOLEAN NOT NULL DEFAULT true,
    "allowEarlyCheckout" BOOLEAN NOT NULL DEFAULT false,
    "requireFaceMatch" BOOLEAN NOT NULL DEFAULT false,
    "requireRegisteredDevice" BOOLEAN NOT NULL DEFAULT true,
    "requireGeofence" BOOLEAN NOT NULL DEFAULT true,
    "maxOfflineSyncHours" INTEGER NOT NULL DEFAULT 48,
    "maxFaceAttempts" INTEGER NOT NULL DEFAULT 3,
    "weeklyOffs" JSONB,
    "breakRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "scope" "PolicyScope" NOT NULL,
    "deptId" UUID,
    "employeeId" UUID,

    CONSTRAINT "policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "isOvernight" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_shift_rosters" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "rosterDate" DATE NOT NULL,

    CONSTRAINT "employee_shift_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_holidays" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "holidayName" TEXT NOT NULL,
    "holidayDate" DATE NOT NULL,
    "officeLocationId" UUID,

    CONSTRAINT "tenant_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registered_devices" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "deviceUuid" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "pushToken" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" UUID,
    "blockedBy" UUID,
    "blockedReason" TEXT,
    "replacedByDeviceId" UUID,
    "lastIp" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "registered_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "appliedShiftId" UUID,
    "firstCheckin" TIMESTAMP(3),
    "lastCheckout" TIMESTAMP(3),
    "totalWorkMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT_OPEN',
    "appliedPolicySnapshot" JSONB,
    "resolvedExceptionId" UUID,
    "finalizedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" UUID,
    "payrollLockId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_lock_periods" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "status" "LockStatus" NOT NULL DEFAULT 'OPEN',
    "lockedBy" UUID,
    "lockedAt" TIMESTAMP(3),
    "reopenedBy" UUID,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "exportId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_lock_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "attendanceLogId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "verificationLogId" UUID,
    "clientEventUuid" UUID,
    "eventType" "EventType" NOT NULL,
    "source" "PunchSource" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "accuracyM" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "syncTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOfflineSync" BOOLEAN NOT NULL DEFAULT false,
    "timeSuspect" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" UUID,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_verification_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "deviceId" UUID,
    "verificationType" "VerificationType" NOT NULL,
    "attemptLatitude" DECIMAL(9,6),
    "attemptLongitude" DECIMAL(9,6),
    "attemptAccuracyM" INTEGER,
    "matchedOfficeId" UUID,
    "distanceFromGeofenceM" INTEGER,
    "locationMethod" "LocationMethod" NOT NULL DEFAULT 'NONE',
    "faceMatchScore" INTEGER,
    "livenessOk" BOOLEAN,
    "selfieKey" TEXT,
    "gpsValid" BOOLEAN,
    "observedIp" TEXT,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "osVersion" TEXT,
    "mockLocation" BOOLEAN NOT NULL DEFAULT false,
    "isRooted" BOOLEAN NOT NULL DEFAULT false,
    "deviceValid" BOOLEAN,
    "clockSkewSeconds" INTEGER,
    "integrityVerdict" JSONB,
    "verificationStatus" "VerificationStatus" NOT NULL,
    "failureReasons" JSONB NOT NULL DEFAULT '[]',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_exceptions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "exceptionType" "ExceptionType" NOT NULL,
    "source" "ExceptionSource" NOT NULL DEFAULT 'MANUAL',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "approvedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_tracking_sessions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "deviceId" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endReason" "TrackingEndReason",

    CONSTRAINT "field_tracking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_location_pings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracyM" INTEGER,
    "speedMps" DECIMAL(6,2),
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "batteryLevel" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "isOfflineSync" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "field_location_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_route_summaries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "routeDate" DATE NOT NULL,
    "simplifiedPath" JSONB NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "pingCount" INTEGER NOT NULL,
    "trackingGapMinutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "field_route_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regularization_requests" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "attendanceLogId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "requestedCheckin" TIMESTAMP(3),
    "requestedCheckout" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "attachmentKey" TEXT,
    "managerComments" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regularization_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_consents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "consentIp" TEXT,
    "consentUserAgent" TEXT,

    CONSTRAINT "biometric_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_audit_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "actorUserId" UUID,
    "impersonationSessionId" UUID,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestedBy" UUID NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "period" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "accrualLogic" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "remainingDays" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "halfDayStart" BOOLEAN NOT NULL DEFAULT false,
    "halfDayEnd" BOOLEAN NOT NULL DEFAULT false,
    "totalDays" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "managerComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "channel" "NotifChannel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "ruleType" "AlertRuleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "thresholdConfig" JSONB NOT NULL DEFAULT '{}',
    "channels" JSONB NOT NULL DEFAULT '["IN_APP"]',
    "notifyRoles" JSONB NOT NULL DEFAULT '[]',
    "notifyUserIds" JSONB NOT NULL DEFAULT '[]',
    "scopeDeptIds" JSONB NOT NULL DEFAULT '[]',
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "verificationLogId" UUID,
    "attendanceEventId" UUID,
    "ruleId" UUID,
    "alertType" "SecurityAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "acknowledgedBy" UUID,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
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
    "providerRef" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "deviceId" UUID,
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
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenantId_status_idx" ON "tenant_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "modules_key_key" ON "modules"("key");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_modules_tenantId_moduleId_key" ON "tenant_modules"("tenantId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_invoices_invoiceNumber_key" ON "tenant_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "tenant_invoices_tenantId_status_idx" ON "tenant_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_invoiceId_idx" ON "payment_transactions"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE INDEX "impersonation_sessions_tenantId_startedAt_idx" ON "impersonation_sessions"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "system_alerts_status_severity_createdAt_idx" ON "system_alerts"("status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "system_audit_logs_actorPlatformUserId_createdAt_idx" ON "system_audit_logs"("actorPlatformUserId", "createdAt");

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
CREATE INDEX "departments_tenantId_idx" ON "departments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenantId_parentDeptId_name_key" ON "departments"("tenantId", "parentDeptId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "designations_tenantId_name_key" ON "designations"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE INDEX "employees_tenantId_status_idx" ON "employees"("tenantId", "status");

-- CreateIndex
CREATE INDEX "employees_tenantId_deptId_idx" ON "employees"("tenantId", "deptId");

-- CreateIndex
CREATE INDEX "employees_tenantId_managerId_idx" ON "employees"("tenantId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_employeeCode_key" ON "employees"("tenantId", "employeeCode");

-- CreateIndex
CREATE INDEX "employment_events_tenantId_employeeId_effectiveDate_idx" ON "employment_events"("tenantId", "employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "import_jobs_tenantId_createdAt_idx" ON "import_jobs"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "office_locations_tenantId_officeName_key" ON "office_locations"("tenantId", "officeName");

-- CreateIndex
CREATE INDEX "employee_office_assignments_tenantId_employeeId_idx" ON "employee_office_assignments"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_office_assignments_tenantId_employeeId_officeLocat_key" ON "employee_office_assignments"("tenantId", "employeeId", "officeLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_policies_tenantId_name_key" ON "attendance_policies"("tenantId", "name");

-- CreateIndex
CREATE INDEX "policy_assignments_tenantId_scope_deptId_idx" ON "policy_assignments"("tenantId", "scope", "deptId");

-- CreateIndex
CREATE INDEX "policy_assignments_tenantId_scope_employeeId_idx" ON "policy_assignments"("tenantId", "scope", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_tenantId_name_key" ON "shifts"("tenantId", "name");

-- CreateIndex
CREATE INDEX "employee_shift_rosters_tenantId_rosterDate_idx" ON "employee_shift_rosters"("tenantId", "rosterDate");

-- CreateIndex
CREATE UNIQUE INDEX "employee_shift_rosters_tenantId_employeeId_rosterDate_key" ON "employee_shift_rosters"("tenantId", "employeeId", "rosterDate");

-- CreateIndex
CREATE INDEX "tenant_holidays_tenantId_holidayDate_idx" ON "tenant_holidays"("tenantId", "holidayDate");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_holidays_tenantId_holidayDate_officeLocationId_key" ON "tenant_holidays"("tenantId", "holidayDate", "officeLocationId");

-- CreateIndex
CREATE INDEX "registered_devices_tenantId_employeeId_status_idx" ON "registered_devices"("tenantId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registered_devices_tenantId_deviceUuid_key" ON "registered_devices"("tenantId", "deviceUuid");

-- CreateIndex
CREATE INDEX "attendance_logs_tenantId_attendanceDate_attendanceStatus_idx" ON "attendance_logs"("tenantId", "attendanceDate", "attendanceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_tenantId_employeeId_attendanceDate_key" ON "attendance_logs"("tenantId", "employeeId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_lock_periods_tenantId_period_key" ON "payroll_lock_periods"("tenantId", "period");

-- CreateIndex
CREATE INDEX "attendance_events_tenantId_employeeId_eventTime_idx" ON "attendance_events"("tenantId", "employeeId", "eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_tenantId_employeeId_clientEventUuid_key" ON "attendance_events"("tenantId", "employeeId", "clientEventUuid");

-- CreateIndex
CREATE INDEX "attendance_verification_logs_tenantId_employeeId_verifiedAt_idx" ON "attendance_verification_logs"("tenantId", "employeeId", "verifiedAt");

-- CreateIndex
CREATE INDEX "attendance_verification_logs_tenantId_verificationStatus_ve_idx" ON "attendance_verification_logs"("tenantId", "verificationStatus", "verifiedAt");

-- CreateIndex
CREATE INDEX "attendance_exceptions_tenantId_employeeId_startDate_endDate_idx" ON "attendance_exceptions"("tenantId", "employeeId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "field_tracking_sessions_tenantId_employeeId_startedAt_idx" ON "field_tracking_sessions"("tenantId", "employeeId", "startedAt");

-- CreateIndex
CREATE INDEX "field_location_pings_tenantId_employeeId_capturedAt_idx" ON "field_location_pings"("tenantId", "employeeId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "field_route_summaries_tenantId_employeeId_routeDate_key" ON "field_route_summaries"("tenantId", "employeeId", "routeDate");

-- CreateIndex
CREATE INDEX "regularization_requests_tenantId_status_createdAt_idx" ON "regularization_requests"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "regularization_requests_tenantId_employeeId_idx" ON "regularization_requests"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "biometric_consents_tenantId_employeeId_idx" ON "biometric_consents"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "tenant_audit_logs_tenantId_module_createdAt_idx" ON "tenant_audit_logs"("tenantId", "module", "createdAt");

-- CreateIndex
CREATE INDEX "tenant_audit_logs_tenantId_entityType_entityId_idx" ON "tenant_audit_logs"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "report_exports_tenantId_createdAt_idx" ON "report_exports"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_tenantId_name_key" ON "leave_policies"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_tenantId_employeeId_policyId_key" ON "leave_balances"("tenantId", "employeeId", "policyId");

-- CreateIndex
CREATE INDEX "leave_requests_tenantId_status_createdAt_idx" ON "leave_requests"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_eventKey_channel_locale_key" ON "notification_templates"("eventKey", "channel", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_tenantId_ruleType_key" ON "alert_rules"("tenantId", "ruleType");

-- CreateIndex
CREATE INDEX "security_alerts_tenantId_status_createdAt_idx" ON "security_alerts"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "security_alerts_tenantId_employeeId_createdAt_idx" ON "security_alerts"("tenantId", "employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenantId_userId_eventKey_channel_key" ON "notification_preferences"("tenantId", "userId", "eventKey", "channel");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_isRead_createdAt_idx" ON "notifications"("tenantId", "userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_createdAt_idx" ON "outbox_events"("publishedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "tenant_billing_profiles" ADD CONSTRAINT "tenant_billing_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_invoices" ADD CONSTRAINT "tenant_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentDeptId_fkey" FOREIGN KEY ("parentDeptId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_deptId_fkey" FOREIGN KEY ("deptId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_defaultShiftId_fkey" FOREIGN KEY ("defaultShiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_office_assignments" ADD CONSTRAINT "employee_office_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_office_assignments" ADD CONSTRAINT "employee_office_assignments_officeLocationId_fkey" FOREIGN KEY ("officeLocationId") REFERENCES "office_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "attendance_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_shift_rosters" ADD CONSTRAINT "employee_shift_rosters_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registered_devices" ADD CONSTRAINT "registered_devices_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_appliedShiftId_fkey" FOREIGN KEY ("appliedShiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_payrollLockId_fkey" FOREIGN KEY ("payrollLockId") REFERENCES "payroll_lock_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_attendanceLogId_fkey" FOREIGN KEY ("attendanceLogId") REFERENCES "attendance_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_consents" ADD CONSTRAINT "biometric_consents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
