# Database Table Ownership

Prisma remains the technical schema source. This file defines which bounded context
owns writes and business invariants. Other contexts may read through a public query
contract but must not introduce direct writes.

| Context               | Owned data                                                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity & Access     | users, roles, permissions, invitations, refresh/reset/verification tokens                                                                                               |
| Workspace             | tenants, workspace settings, assets, onboarding state, module entitlements                                                                                              |
| Organization          | employees, employment history, departments, designations, managers, employee documents                                                                                  |
| Attendance            | policies, offices, shifts, rosters, holidays, punches, attendance days, devices, biometric evidence, field sessions, leave, regularizations, report jobs, payroll locks |
| Billing               | plans, subscriptions, invoices, payments, billing events, seat snapshots                                                                                                |
| Platform Admin        | platform administrators, impersonation grants, operational and tenant audit records                                                                                     |
| Notifications         | delivery attempts and provider-neutral notification state                                                                                                               |
| Shared Infrastructure | outbox records, idempotency/lease state, retention metadata                                                                                                             |

Until repositories are fully separated, code review and `architecture:check` enforce
the ownership direction. A new product must add its ownership here before adding
tables or migrations.
