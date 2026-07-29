UPDATE "tenant_locale_policies"
SET
  "defaultLocale" = CASE
    WHEN "defaultLocale" LIKE 'ar%' THEN 'ar'
    ELSE 'en'
  END,
  "enabledLocales" = ARRAY(
    SELECT DISTINCT
      CASE WHEN locale LIKE 'ar%' THEN 'ar' ELSE 'en' END
    FROM unnest("enabledLocales") AS locale
    ORDER BY 1
  )::TEXT[];

ALTER TABLE "tenant_locale_policies"
  DROP CONSTRAINT IF EXISTS "tenant_locale_policies_default_enabled";

ALTER TABLE "tenant_locale_policies"
  DROP CONSTRAINT IF EXISTS "tenant_locale_policies_enabled_not_empty";

ALTER TABLE "tenant_locale_policies"
  ADD CONSTRAINT "tenant_locale_policies_default_public_language"
    CHECK ("defaultLocale" IN ('en', 'ar')),
  ADD CONSTRAINT "tenant_locale_policies_enabled_public_languages"
    CHECK ("enabledLocales" <@ ARRAY['en', 'ar']::TEXT[]),
  ADD CONSTRAINT "tenant_locale_policies_enabled_not_empty"
    CHECK (cardinality("enabledLocales") > 0),
  ADD CONSTRAINT "tenant_locale_policies_default_enabled"
    CHECK ("defaultLocale" = ANY("enabledLocales"));
