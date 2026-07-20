# Platform

Platform capabilities are reusable across DeltCRM products. They own tenant identity,
authorization, organization structure, tenancy, billing, notifications, audit and the
operator control plane.

Product code must import a platform capability through that capability's `public.ts`
entry point. Platform code must not depend on a product implementation; temporary
exceptions are frozen in `architecture/module-boundaries.json` and have removal dates.
