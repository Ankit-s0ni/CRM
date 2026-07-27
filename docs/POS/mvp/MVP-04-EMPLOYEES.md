# MVP-04 — Employee Management

> **Spec section**: 12.3 Employee Management
> **Depends on**: Phase 1 (permission seed, roles)
> **Blocks**: MVP-05 Registers & Sessions (a session needs a cashier and a PIN)
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: invite employees by email, assign a role, assign outlets, set a numeric PIN for register
switching, per-employee activity log, salesperson capture on transactions.

**Out**: the default-role catalogue and custom role builder (12.1, 12.2 — three seeded roles ship instead),
commission rules and reports (12.4).

### ⚠️ Roles: seeded, not authorable

12.3 says "assign roles" but 12.1/12.2 are excluded, so there is no role-management UI. Three **system**
roles are seeded and the employee form picks one of them:

| Role | Grants |
|---|---|
| **POS Administrator** | Every `pos.*` key + `customer.*` |
| **POS Store Manager** | Catalog write, inventory read, customers, returns, sessions, discount override — no settings, no delete |
| **POS Cashier** | `pos.sale.create`, `pos.sale.discount`, `pos.product.read`, `customer.read`, `customer.create`, session open/close |

These are `Role` rows with `isSystem = true`, so the future 12.2 role builder can add tenant roles beside
them without migration.

---

## Data model

Employees already exist (`User`, `Employee`, `Role`, `UserRole`). Two new POS tables:

| Model | Notes |
|---|---|
| `PosEmployeeOutlet` | `userId` + `outletId`, unique per pair — restricts which outlets a user may transact in |
| `PosCashierPin` | `userId` unique per tenant, `pinHash` (Argon2), `failedCount`, `lockedUntil`, `lastUsedAt` |

### The PIN is not a login credential

A 4–6 digit PIN has at most a million combinations, and realistically far fewer. It is a **convenience
factor on an already-authenticated terminal**, not an authentication factor.

Non-negotiable rules:

- Hashed with **Argon2**, using the same configuration as passwords. Never stored or logged in clear.
- Verified **server-side only**. The PIN never reaches the client, and the client never compares hashes.
- Rate-limited: 5 consecutive failures sets `lockedUntil` (15 minutes). Unlocking early requires a full
  credential login by an administrator.
- Issues **no session token on its own**. It switches the active cashier on a terminal whose browser
  session is already authenticated, and it authorises a manager override prompt. Nothing else.
- Every PIN verification — success or failure — writes a `TenantAuditLog` row.
- Minimum 4 digits, maximum 6. Reject trivial PINs (`0000`, `1234`, repeated digits).

Activity log reuses the existing `TenantAuditLog`; no new table.

---

## Permissions

```
pos.employee.read    pos.employee.manage    pos.employee.pin.manage
```

Grants: Administrator all three; Store Manager `read` + `pin.manage` (so a manager can reset a cashier's
PIN mid-shift); Cashier none.

A user may always set **their own** PIN without `pin.manage`; setting someone else's requires it.

---

## API

`apps/api/src/products/pos/employees/`

| Method | Route | Permission |
|---|---|---|
| GET | `/pos/employees` — POS users with role and outlets | `pos.employee.read` |
| GET | `/pos/employees/:id` | `pos.employee.read` |
| POST | `/pos/employees/invite` — email + role + outlets | `pos.employee.manage` |
| PATCH | `/pos/employees/:id/role` | `pos.employee.manage` |
| PUT | `/pos/employees/:id/outlets` | `pos.employee.manage` |
| PATCH | `/pos/employees/:id/status` — activate / deactivate | `pos.employee.manage` |
| PUT | `/pos/employees/:id/pin` — set or reset | `pos.employee.pin.manage` (or self) |
| DELETE | `/pos/employees/:id/pin` | `pos.employee.pin.manage` |
| POST | `/pos/employees/pin/verify` — `{ pin }`, returns `{ userId, name, permissions }` | authenticated session |
| POST | `/pos/employees/pin/unlock` — clears `lockedUntil` | `pos.employee.manage` |
| GET | `/pos/employees/:id/activity` — paginated audit entries | `pos.employee.read` |

`POST /pos/employees/pin/verify` is the single verification path used by both cashier switching (MVP-05)
and manager override prompts (MVP-06 price/discount override, MVP-08 refund approval). It must be rate
limited **per terminal and per tenant**, not only per user — otherwise an attacker enumerates users by
cycling PINs against different accounts.

Invitations reuse the existing `VerificationToken` + transactional email flow. Do not build a parallel
invite mechanism.

---

## Web

```
apps/web/src/app/pos/employees/
├── page.tsx        → list: name, role, outlets, PIN set?, status
├── invite/page.tsx → invite form
└── [id]/page.tsx   → detail: role, outlets, PIN reset, activity log
```

A shared `<ManagerOverrideDialog>` in `features/products/pos/employees/` wraps the PIN pad and is reused by
MVP-06 and MVP-08. It returns the verified user so the caller can attribute the override in its audit
entry.

The PIN pad is touch-first: large numeric keys, masked display, no browser autofill, `inputMode="numeric"`,
and `autocomplete="off"`.

---

## Implementation steps

1. **Schema** — `PosEmployeeOutlet` and `PosCashierPin` under the `POS — REGISTER & OUTLETS` banner, with
   RLS policies and grants.
2. **Seed the three system roles** with their permission sets, in `prisma/seed.js` beside the existing
   role seeding.
3. **Employee query service** — list POS users by joining `User` / `Employee` / `UserRole`, reading
   Organization through its public contract rather than querying its tables directly.
4. **Invite flow** — reuse `VerificationToken` and the existing transactional email service; on
   acceptance, assign the chosen role and outlet rows.
5. **Outlet assignment** — replace-set semantics on `PUT`. With C5 (single outlet) every employee gets the
   one outlet, but the join table and the checks ship now so multi-outlet is a data change later.
6. **PIN service** — set (with strength rules), verify (Argon2 + lockout + audit), reset, unlock. Write
   this before MVP-05 consumes it.
7. **Rate limiting** — per terminal and per tenant on `pin/verify`.
8. **Activity log endpoint** — filtered `TenantAuditLog` query by actor.
9. **Web** — list, invite, detail, and the shared override dialog.
10. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | PIN strength rules reject `0000`, `1234`, repeated digits, and lengths outside 4–6 |
| Unit | Lockout after exactly 5 failures; a success before the 5th resets the counter |
| Integration | PIN hash never appears in any API response or log line |
| Integration | `pin/verify` returns the same generic error for wrong PIN and unknown user (no enumeration) |
| Integration | A locked PIN stays locked until `lockedUntil` passes or an admin unlocks |
| Integration | Both successful and failed verifications write audit rows |
| Integration | Tenant isolation — a PIN from tenant A never verifies against tenant B |
| E2E | Invite → accept → set PIN → switch cashier at the register |

---

## Done when

- An administrator can invite a cashier who receives an email, sets a password, and gets a PIN.
- The PIN pad switches cashiers and satisfies manager overrides, with every attempt audited.
- Brute-forcing a PIN is rate-limited and locks out, and failures leak nothing about which users exist.

---

## Open decisions

- **PIN length** — proposal: exactly 4 digits for speed, given lockout and the already-authenticated
  terminal make entropy less critical. The spec says 4–6. Confirm.
- **Lockout duration** — proposal: 15 minutes, admin-clearable.
- **Salesperson capture** — 12.3 asks for it and `PosSale.salespersonId` exists, but the UI to *choose* a
  salesperson is 3.3, which is excluded. Recommend defaulting `salespersonId` to the session cashier so the
  column is populated for future commission reports, with no picker in the MVP. Confirm.
