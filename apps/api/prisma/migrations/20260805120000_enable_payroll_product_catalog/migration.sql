-- Payroll is implemented and can be assigned to tenants from the platform.
-- Keep this as a new migration because existing environments may have already
-- recorded the earlier payroll migration before its catalog update was added.
UPDATE "modules"
SET "name" = 'Payroll',
    "description" = 'Payroll foundation, compensation configuration, policy setup, and protected employee payroll data',
    "icon" = 'wallet-cards',
    "availability" = 'AVAILABLE',
    "kind" = 'PRODUCT',
    "parentModuleId" = NULL,
    "dependencyKeys" = ARRAY['ATTENDANCE']::TEXT[],
    "customerVisible" = true,
    "catalogOrder" = 30
WHERE "key" = 'PAYROLL';
