-- Complete the Platform-owned tenant settings projection. The clean Platform
-- baseline originally created only identity fields while the Platform runtime
-- and product onboarding contract still require these shared defaults.
ALTER TABLE "tenant_settings"
  ADD COLUMN "weeklyOffs" JSONB NOT NULL DEFAULT '["SAT","SUN"]',
  ADD COLUMN "requireFacialRecognition" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "faceMatchThreshold" INTEGER NOT NULL DEFAULT 85,
  ADD COLUMN "fieldTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "fieldTrackingIntervalMin" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "checkinReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "checkoutReminderMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "regularizationWindowDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "absenteeAlertTime" TEXT NOT NULL DEFAULT '10:00',
  ADD COLUMN "workingDayStart" TEXT NOT NULL DEFAULT '09:00',
  ADD COLUMN "workingDayEnd" TEXT NOT NULL DEFAULT '18:00';

ALTER TABLE "tenant_settings"
  ADD CONSTRAINT "tenant_settings_face_match_threshold_valid"
    CHECK ("faceMatchThreshold" BETWEEN 0 AND 100),
  ADD CONSTRAINT "tenant_settings_field_tracking_interval_valid"
    CHECK ("fieldTrackingIntervalMin" BETWEEN 1 AND 120),
  ADD CONSTRAINT "tenant_settings_checkout_reminder_valid"
    CHECK ("checkoutReminderMinutes" BETWEEN 1 AND 120),
  ADD CONSTRAINT "tenant_settings_regularization_window_valid"
    CHECK ("regularizationWindowDays" BETWEEN 1 AND 90);
