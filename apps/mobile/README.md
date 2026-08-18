# DeltCRM HRMS Mobile — Transitional Read-Only Copy

This directory is not the canonical mobile source.

The canonical Flutter employee application is:

```text
deltcrm-hrms/apps/mobile
```

Do not implement mobile features, API migrations, native signing changes, or
releases in this Platform copy. Make every change in HRMS first. This copy is
retained only for temporary parity and rollback traceability until the removal
gates in `HRMS-MOBILE-OWNERSHIP-AND-API-MIGRATION-IMPLEMENTATION-PLAN.md` pass.

From the Platform repository, verify source parity with:

```bash
pnpm mobile:parity:check
```
