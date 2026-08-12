# Delsia Platform

This repository owns the Delsia multi-product control plane: workspace identity,
tenant administration, product registration, entitlements, plans, billing,
shared notifications, and product launch/navigation.

## HRMS mobile ownership

The Flutter employee application is owned by the HRMS product repository at
`deltcrm-hrms/apps/mobile`.

`CRM/apps/mobile` is a temporary read-only parity copy. Do not implement mobile
features, API migrations, native signing changes, or releases from this copy.
Make changes in the HRMS repository first and keep the transitional copy in
parity until the removal gates in the mobile migration plan pass.

Run the temporary local parity check from the parent workspace:

```bash
pnpm mobile:parity:check
```

The Platform copy must not be deleted until HRMS independently owns mobile CI,
signing, release, real-stack verification, monitoring, and rollback.
