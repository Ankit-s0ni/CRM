ALTER TABLE tenant_subscriptions
  ADD COLUMN "pendingPlanId" UUID,
  ADD COLUMN "scheduledChangeAt" TIMESTAMPTZ,
  ADD CONSTRAINT tenant_subscriptions_pending_plan_fk
    FOREIGN KEY ("pendingPlanId") REFERENCES subscription_plans(id) ON DELETE RESTRICT;

GRANT SELECT, INSERT, UPDATE ON invoice_sequences TO app_user;
