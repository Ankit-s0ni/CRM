# MVP-05 — Register & Session Management

> **Spec sections**: 11.1 Register Configuration · 11.2 Session Workflow · 11.3 Session Reports ·
> 11.4 Multi-Register Support
> **Depends on**: MVP-04 Employees (cashier + PIN)
> **Blocks**: MVP-06 Billing — every sale requires an open session
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: register CRUD and device mapping, open/close session with float and denomination count, cash
in/out during a session, expected-vs-actual reconciliation, session summary report, multiple independent
registers per outlet with consolidated reporting.

**Out**: cross-outlet consolidation (13 — single outlet per C5), scheduled EOD emails (22),
printed session report as a designed template (MVP-06 owns the one thermal layout; this area reuses it).

Cash movement recording (10.4) is specified in MVP-07 but **implemented here**, because cash in/out and
the closing count are session operations. MVP-07 covers the payment-method side of cash; this file covers
the drawer.

---

## Data model

| Model | Notes |
|---|---|
| `PosOutlet` | One per tenant in MVP (C5); created by the setup wizard |
| `PosRegister` | `name` unique per outlet, optional `deviceId`, `isActive` |
| `PosSession` | `registerId`, `cashierId`, `openingFloat`, `closingAmount`, `expectedAmount`, `discrepancy`, `status`, `denominations Json`, `closingNotes` |
| `PosCashMovement` | `sessionId`, `type` (`CASH_IN` / `CASH_OUT`), `amount`, `reason`, `performedBy` |

### The one-open-session invariant

A register may have **at most one** `OPEN` session at a time. This is the core invariant of the area, and
application-level checking is not sufficient under concurrency — two tabs can both pass a check and both
insert.

Enforce it in the database with a partial unique index:

```sql
CREATE UNIQUE INDEX pos_sessions_one_open_per_register
  ON pos_sessions ("tenantId", "registerId")
  WHERE status = 'OPEN';
```

The service catches the constraint violation and returns a clean "register already has an open session"
error rather than a 500.

### Denominations

Omani Rial denominations, stored as `Json` on the session — a map of denomination to count:

| Notes | 50, 20, 10, 5, 1 OMR |
| Coins | 500, 100, 50, 25 baisa |

1 OMR = 1000 baisa. Store counts, not computed totals, and recompute the total server-side — never trust a
client-sent total.

### Reconciliation arithmetic

```
expectedAmount = openingFloat
               + cash sales
               − cash refunds
               + cash in
               − cash out

discrepancy    = closingAmount − expectedAmount
```

Negative is a shortage, positive an excess. Compute `expectedAmount` **server-side at close time** from the
session's own sales and movements. Never accept it from the client, and never store it before close — a
stale expected value is a reconciliation bug that looks like theft.

Only `CASH` tender counts toward the drawer. Amwal and card payments are excluded from the expected cash.

---

## Permissions

```
pos.register.manage           pos.register.open-session
pos.register.close-session    pos.register.cash-management
pos.session.read
```

Grants: Administrator all; Store Manager all; Cashier `open-session`, `close-session`,
`cash-management`, and `session.read` scoped to their own sessions.

A cashier may read only their own sessions; a manager reads all. Enforce in the service — the guard only
proves the key is held.

---

## API

`apps/api/src/products/pos/register/`

| Method | Route | Permission |
|---|---|---|
| GET | `/pos/registers` | `pos.register.manage` |
| POST | `/pos/registers` | `pos.register.manage` |
| PATCH | `/pos/registers/:id` | `pos.register.manage` |
| PATCH | `/pos/registers/:id/status` | `pos.register.manage` |
| GET | `/pos/registers/:id/current-session` — what the register UI polls on load | `pos.register.open-session` |
| POST | `/pos/sessions` — open: `{ registerId, openingFloat, denominations? }` | `pos.register.open-session` |
| GET | `/pos/sessions` — list, filters: register, cashier, status, date range | `pos.session.read` |
| GET | `/pos/sessions/:id` — detail + movements + totals | `pos.session.read` |
| GET | `/pos/sessions/:id/summary` — the 11.3 report payload | `pos.session.read` |
| GET | `/pos/sessions/:id/expected-cash` — live expected figure for the close screen | `pos.register.close-session` |
| POST | `/pos/sessions/:id/close` — `{ closingAmount, denominations, closingNotes? }` | `pos.register.close-session` |
| POST | `/pos/sessions/:id/cash-movements` — `{ type, amount, reason }` | `pos.register.cash-management` |
| GET | `/pos/sessions/:id/cash-movements` | `pos.session.read` |

### Session summary payload (11.3)

Duration, transaction count, gross sales, per-tender breakdown, returns count and value, discounts given,
cash in, cash out, opening float, expected cash, actual cash, discrepancy, and per-cashier sub-totals when
more than one person billed on the session.

---

## Web

```
apps/web/src/app/pos/registers/
├── page.tsx        → register list + live status (open/closed, current cashier)
├── new/page.tsx    → create register
└── sessions/
    ├── page.tsx        → session history + discrepancies
    └── [id]/page.tsx   → session detail + summary + print
```

Two dialogs live in `features/products/pos/register/` and are launched from the billing screen (MVP-06),
not only from these pages:

- **`<SessionOpenDialog>`** — register select, opening float, optional denomination breakdown. This is the
  gate the register UI shows when no session is open.
- **`<SessionCloseDialog>`** — denomination grid that totals as you type, the server's expected figure
  revealed **after** the count is entered, discrepancy highlighted, notes required when non-zero.

> Reveal the expected amount only after the cashier commits their count. Showing it first turns a blind
> count into a copy — the control is worthless if the answer is on screen.

---

## Implementation steps

1. **Schema** — `PosOutlet`, `PosRegister`, `PosSession`, `PosCashMovement` under the
   `POS — REGISTER & OUTLETS` banner, with RLS policies and grants.
2. **Partial unique index** for one open session per register, in the same migration.
3. **Register service + controller** — CRUD, plus a guard that a register with an open session cannot be
   deactivated.
4. **Session service** — open (validates: no open session, cashier assigned to the outlet, float
   non-negative), and `getCurrentSession`.
5. **Cash movement service** — record in/out with a mandatory reason; reject amounts ≤ 0; a cash-out
   exceeding the drawer's current expected cash requires `pos.register.cash-management` and writes an
   audit row.
6. **Expected-cash calculator** — pure domain function over sales, refunds and movements. No Prisma
   imports; unit-test it directly.
7. **Session close** — recompute expected server-side, persist closing amount, denominations, discrepancy
   and notes, set `CLOSED` and `closedAt`, write an audit row, publish `pos.session.closed` to the outbox.
   Require notes when the discrepancy is non-zero.
8. **Session summary** — aggregate query behind `/summary`.
9. **Web** — register pages, session history and detail, the two dialogs.
10. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | Expected-cash arithmetic across float, cash sales, cash refunds, cash in, cash out |
| Unit | Non-cash tenders are excluded from expected cash |
| Unit | Denomination totals in baisa, converted exactly to OMR |
| Unit | Discrepancy sign — shortage negative, excess positive |
| Integration | Two concurrent open requests on one register: exactly one succeeds |
| Integration | Closing a session with open sales attached is rejected (or forces void — see open decisions) |
| Integration | A cashier cannot read another cashier's session |
| Integration | Tenant isolation on sessions |
| E2E | Open with 50.000 float → two cash sales → cash-out 5.000 → close with a deliberate 2.750 shortage → summary reports it |

---

## Done when

- A register cannot hold two open sessions under any concurrency.
- Expected cash is computed server-side at close, from the session's own data.
- A closed session produces a printable summary matching what the drawer contained.
- MVP-06 can require an open session before permitting any sale.

---

## Open decisions

- **Closing with held orders** — a parked order (MVP-06) belongs to a session. Proposal: block close while
  held orders exist, listing them, and let the cashier void or complete each. Alternative is auto-voiding,
  which loses work. Confirm.
- **Cross-session recall** — should a held order from a closed session be recallable in the next session?
  Proposal: yes, held orders belong to the register, not the session. Confirm before MVP-06.
- **Session hard limits** — should a session auto-close after N hours? Proposal: no auto-close in the MVP,
  but flag sessions open over 24h on the dashboard.
