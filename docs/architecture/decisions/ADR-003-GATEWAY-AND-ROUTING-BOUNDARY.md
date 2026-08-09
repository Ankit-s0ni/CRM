# ADR-003: Gateway and Routing Boundary

## Status

Accepted for Phase 1 on 2026-08-05.

## Decision

Customers keep one tenant host. The gateway routes locale-aware product paths without exposing deployment topology:

```text
/{locale}/app/hrms/* -> HRMS frontend
/api/hrms/*          -> HRMS API
```

`en` and `ar` are preserved across navigation, refresh and deep links. API routes are locale-independent. The shared shell obtains navigation from the Platform contract rather than hardcoded product assumptions.

## Consequences

Products can deploy independently while customers retain one workspace and one browser origin. Legacy routes remain temporary aliases until usage telemetry confirms safe removal.
