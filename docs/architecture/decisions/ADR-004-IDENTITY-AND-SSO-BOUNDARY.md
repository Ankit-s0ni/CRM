# ADR-004: Identity and SSO Boundary

## Status

Accepted for Phase 1 on 2026-08-05.

## Decision

Platform remains the only authentication authority. Browser sessions use secure HTTP-only cookies. Products exchange an authenticated Platform session for short-lived, audience-specific RS256 tokens and validate issuer, audience, expiry, tenant, membership, entitlement and permission.

The Platform publishes public verification keys through JWKS. Headers such as `X-Tenant-Id` are correlation hints only and never establish identity or tenant authorization.

## Consequences

One login opens all entitled products. Product services can validate requests independently without reading Platform identity tables or sharing the Platform session signing secret.
