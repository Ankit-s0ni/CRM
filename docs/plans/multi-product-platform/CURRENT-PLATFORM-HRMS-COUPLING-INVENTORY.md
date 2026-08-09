# Current Platform and HRMS Coupling Inventory

**Recorded:** 2026-08-05  
**Freeze rule:** No new direct coupling may be added. Any unavoidable Phase 1 access must go through the named temporary adapter and include a removal owner.

## Current ownership

| Current area | Intended owner | Phase 1 action |
|---|---|---|
| `platform/identity` users, roles and sessions | Platform | Expose identity through signed product-token claims |
| `platform/control-plane` plans, modules and overrides | Platform | Expose normalized effective entitlements |
| `platform/organization` employees and hierarchy | HRMS | Keep data in place; place access behind HRMS composition boundary |
| `platform/workspace-settings` offices and tenant setup | Split: Platform policy, HRMS office data | Define contract boundary; do not move records in Phase 1 |
| `products/attendance` attendance, leave and field operations | HRMS | Compose under one HRMS product manifest |
| `products/payroll` payroll business data | HRMS | Compose under one HRMS product manifest |
| Shared Prisma connection and transaction boundary | Temporary monolith infrastructure | Wrap contract-facing reads; remove during extraction |
| Shared outbox table | Temporary event transport | Keep transactional writes; preserve events during extraction |

## Known cross-boundary risks

- Tenant authentication currently uses a shared HMAC secret and claims without product audience.
- HRMS authorization currently reads tenant modules and permissions from the shared database.
- Platform tenant deletion references HRMS biometric storage cleanup.
- Employee quota enforcement combines Platform subscription state and HRMS employee writes in one database transaction.
- Signup provisions tenant identity, HRMS defaults and Attendance activation in one transaction.

## Freeze enforcement

1. New product-facing payloads must be declared in `@deltcrm/product-contracts`.
2. HRMS code may not import `platform/control-plane` implementation files.
3. Platform code may not add reads of attendance, leave or payroll business tables.
4. Any exception requires an ADR amendment, both code owners and a removal date.
5. Architecture checks run in CI and treat newly introduced cross-boundary imports as failures.

## Temporary adapter removal owner

The Platform and HRMS technical leads jointly own removal. The adapter is removed after HRMS validates Platform tokens and entitlements without identity/subscription table access and after the separate HRMS database passes reconciliation and shadow-read checks.
