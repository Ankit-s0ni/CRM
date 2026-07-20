# Platform Control Plane

Owns DeltCRM operator authentication, tenant lifecycle, product entitlements, billing
operations, impersonation, and system health operations. It uses the platform database
connection and must not be imported into tenant business logic.

- Composition root: `platform-control-plane.module.ts`
- Public entry point: `public.ts`
- Owner: Platform team
- Tenant code integrates through explicit application ports or outbox events.
