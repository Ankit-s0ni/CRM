# ADR-001: Product Repository Boundary

## Status

Accepted for Phase 1 on 2026-08-05.

## Decision

Platform and HRMS remain in the current monorepo until the Product Integration Contract acceptance tests pass. Their code is separated by owned composition roots and a versioned contract package. The future `deltcrm-hrms` repository may be created only after the extraction-readiness review.

Products may depend on `@deltcrm/product-contracts`; they may not import Platform control-plane implementations. New direct cross-boundary imports are prohibited.

## Consequences

This avoids a premature distributed monolith while allowing separate teams to work against stable contracts. Repository extraction becomes a deployment change after boundaries are proven, not a simultaneous architecture rewrite.
