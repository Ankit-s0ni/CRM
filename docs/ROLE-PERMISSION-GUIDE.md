# Role and Permission Guide

Permissions are stable machine keys persisted in the database. API authorization reads current role-permission assignments on every request, so changes take effect without issuing new access tokens.

## System roles

- `BUSINESS_ADMIN`: Full workspace, organization, identity, attendance, and billing access.
- `HR_ADMIN`: Organization, identity, and attendance administration without billing access.
- `MANAGER`: Self and recursive reporting-chain employee access plus attendance approvals.
- `EMPLOYEE`: Self employee and attendance access only.

System roles cannot be renamed or deleted. Custom roles may use any permission from `GET /permissions`; assigned custom roles cannot be deleted.

## Safety rules

- A workspace must always retain one active `BUSINESS_ADMIN`.
- Disabling or locking a user revokes all active refresh tokens.
- Managers never receive tenant-wide employee-directory access.
- Permission updates are transactional and recorded in append-only tenant audit logs.
