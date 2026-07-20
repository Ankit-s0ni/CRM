# Attendance Product

## Purpose

Attendance is one customer-facing DeltCRM product. Its capabilities are composed by
`AttendanceProductModule`; they are not separate products or independently sold CRM
modules.

## Capabilities

- Core punch processing and attendance calculation
- Attendance policies, offices, shifts, rosters, and holidays
- Dashboard and attendance register queries
- Device trust, selfie/biometric verification, and security alerts
- Optional field-workforce tracking
- Offline mobile synchronization and runtime configuration
- Leave, OD/WFH exceptions, and attendance corrections
- Attendance reports and payroll-period locking

The capability code is currently split across legacy sibling folders while Sprint 9
migrates it incrementally. New Attendance code must not create another top-level
top-level product sibling. Put it under the Attendance product or extend an existing
capability.

## Public Contract

Other products import only from `src/products/attendance/public.ts`. Internal services,
repositories, controllers, DTOs, and Prisma details are not public contracts.

## Ownership

- Product owner: Attendance team
- Database ownership: documented in `architecture/TABLE-OWNERSHIP.md`
- Composition root: `attendance-product.module.ts`
- Public entry point: `public.ts`

## Dependency Rules

- `domain` contains framework-free business rules.
- `application` orchestrates use cases through ports.
- `infrastructure` implements ports and persistence.
- `presentation` owns HTTP DTOs, guards, and controllers.
- Cross-product work uses public contracts or versioned outbox events.
- Tenant Attendance code must never use the platform-admin database connection.
