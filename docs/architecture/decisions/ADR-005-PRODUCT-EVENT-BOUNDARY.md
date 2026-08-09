# ADR-005: Product Event Boundary

## Status

Accepted for Phase 1 on 2026-08-05.

## Decision

Cross-product lifecycle changes use versioned event envelopes and the transactional outbox. Consumers are idempotent by `eventId`, retries are bounded, and exhausted messages enter an observable dead-letter state.

Synchronous reads use versioned internal APIs with service authentication, request IDs, trace context and explicit timeouts. Events contain identifiers and necessary facts only; secrets and unnecessary personal data are forbidden.

## Consequences

Platform and products can recover independently from temporary outages. Published event payloads are immutable; incompatible changes receive a new event version.
