# Identity

Owns tenant-user authentication, credential lifecycle, token issuance, verification,
password reset, and tenant JWT validation. Authorization roles and invitations are
implemented by the sibling Access context during the incremental Sprint 9 migration.

- Public entry point: `public.ts`
- Owner: Identity team
- Public HTTP guards may be consumed through `public.ts`; token internals are private.
