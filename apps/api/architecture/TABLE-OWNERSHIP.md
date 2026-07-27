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
| Customers             | customers, customer groups                                                                                                                                              |
| POS                   | POS settings, invoice sequence, outlets, registers, sessions, cash movements, tax rates/groups, catalog (products, variants, categories, bundles, batches, units), stock and stock movements, sales, sale items, sale payments, credit notes |
| Shared Infrastructure | outbox records, idempotency/lease state, retention metadata                                                                                                             |

Until repositories are fully separated, code review and `architecture:check` enforce
the ownership direction. A new product must add its ownership here before adding
tables or migrations.

## Notes

**Customers is deliberately not POS-owned.** `customers` and `customer_groups` are a
platform capability so that future products (invoicing, support, marketing) can reuse the
same customer record. POS references `customerId` and updates rolled-up purchase
statistics through the Customers public contract; it never writes those tables directly.

**POS monetary precision differs from Billing on purpose.** POS money columns are
`Decimal(12,3)` because the Omani Rial has three decimal places (1 OMR = 1000 baisa), and
tax rates are `Decimal(5,3)`. Platform billing uses `Decimal(12,2)`. This divergence is
intentional — do not harmonise the two without a migration plan for historical invoices.
