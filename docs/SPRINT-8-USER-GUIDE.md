# DeltCRM GA User Guide

## Platform administrator

Use `/platform/login` with a platform account and MFA. Manage plans/module bundles,
inspect tenants, invoices, payments and dunning, and review provider/system health.
Tenant impersonation requires a support reason and is read-only for billing. Use
the tenant danger zone only after legal-hold and deletion approval are recorded.

## Business administrator and HR

Sign in through the tenant workspace. Complete onboarding, configure company and
attendance settings, activate purchased modules, manage employees/roles, and use
the Attendance hub for policy, office, shift, roster, security, field, report and
payroll-lock workflows. Billing is under Settings and requires billing permissions;
normal HR roles do not receive billing access.

The task-oriented Attendance navigation, role visibility, dynamic capability
behavior, contextual help, and payroll-close workflow are documented in
[`ATTENDANCE-HR-PORTAL-GUIDE.md`](./ATTENDANCE-HR-PORTAL-GUIDE.md).

## Employee

The mobile login screen uses DeltCRM branding. After login, the app loads the
tenant logo, locale, policy, enabled modules and attendance capabilities. It asks
only for permissions required by that policy. Punches and field pings queue safely
offline and synchronize with idempotency. Employees can view their day/history,
requests, notifications, sync state, privacy/consent and device state.

## API consumers

Use the OpenAPI reference at `/api/docs`. Tenant routes require a tenant JWT and
matching tenant context; platform tokens are not interchangeable. Generate UUID
idempotency keys for punch/sync/import/billing commands, preserve request IDs for
support, and treat signed download URLs as short-lived secrets. Webhook bodies must
remain byte-identical for provider signature validation.
