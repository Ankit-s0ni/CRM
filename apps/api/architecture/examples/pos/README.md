# POS Isolation Example

This is a non-production onboarding fixture, not a POS implementation.

A future POS product owns its catalog, register, sale, payment, inventory, routes,
permissions, migrations, events, seed fixture, README, composition root, and public
contract. It may consume Identity, Workspace, Organization, Billing, Audit, and Outbox
public contracts.

It must not import Attendance controllers, services, repositories, DTOs, or Prisma
helpers. `architecture:check --self-test` verifies that `pos -> attendance` is rejected.
