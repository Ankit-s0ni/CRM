# ADR-002: Product Database Boundary

## Status

Accepted for Phase 1 on 2026-08-05.

## Decision

Platform owns identity, membership, tenant lifecycle, subscription, entitlement and product-provisioning data. HRMS owns employee, organization, office, attendance, leave and payroll business data.

Phase 1 does not move or delete data. Existing same-database reads are isolated behind a temporary HRMS adapter with an explicit removal owner. No new product may query another product's tables, and no product receives another product's production database credentials.

## Consequences

Future extraction uses forward-only copy, reconciliation, shadow-read and controlled cutover procedures. Production reset, seed, truncate, destructive migration and unverified bulk deletion remain prohibited.
