# MVP-08 — Returns, Refunds & Exchanges

> **Spec sections**: 9.1 Return Processing · 9.2 Refund Options · 9.3 Exchange Workflow ·
> 9.4 Credit Notes · 9.5 Return Policies
> **Depends on**: MVP-06 Billing, MVP-07 Payments, MVP-02 Inventory, MVP-03 Customers
> **Blocks**: MVP-09 Dashboard (net revenue needs returns)
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: find the original invoice, partial and full returns, mandatory reason and condition, stock
restoration for resellable items, cash / original-method / credit-note refunds, exchanges, credit note
lifecycle, configurable return window and category rules.

**Out**: loyalty point reversal (7 is excluded — nothing was earned), returns without a receipt beyond the
`receiptRequired` toggle, RMA workflows, vendor returns (needs 14).

### ⚠️ C2 — restocking without the adjustments module

4.2 is excluded, but a resellable return must increase stock. It does so through `StockService`
(MVP-02) writing a `PosStockAdjustment` row with `type = RETURN`. That ledger is system-written; no manual
adjustment UI exists. Damaged returns are recorded on the line but **do not** restock.

---

## Data model

Returns reuse `PosSale` — a return is a sale with `isReturn = true` and `originalSaleId` pointing at the
original. No separate return table.

| Model | Notes |
|---|---|
| `PosSale` | `isReturn`, `originalSaleId`, negative amounts on the return row |
| `PosSaleItem` | `returnQuantity`, `returnReason`, `returnCondition` on the **original** line; the return sale gets its own lines |
| `PosCreditNote` | `creditNumber`, `originalAmount`, `balanceAmount`, `customerId`, `saleId`, `expiresAt`, `status` |
| `PosSettings` | `returnWindowDays`, `receiptRequired` |
| `PosCategory` | `returnable` boolean for 9.5 category rules |

### Sign convention — decide once, enforce everywhere

The return `PosSale` stores **negative** `subtotal`, `taxAmount`, `totalAmount` and `netAmount`. This makes
revenue reporting a plain `SUM()` over all sales with no case handling, and makes VAT reporting correct
automatically (a refund reduces output VAT in the period it occurs).

The original sale's status becomes `RETURNED` or `PARTIALLY_RETURNED`, driven by whether every line is
fully returned.

### Credit note numbering

`CN-00001`, gapless per tenant, allocated under a row lock exactly like invoice numbers. It is a financial
document and gaps invite audit questions.

---

## Business rules

Implemented in a pure domain module — `products/pos/core/domain/return-rules.ts`.

1. **Return window** — `saleDate + returnWindowDays >= today`, else rejected. An override needs
   `pos.sale.return.override` (manager PIN).
2. **Category rules** — a line whose product's category has `returnable = false` cannot be returned at all,
   not even with override. This is for hygiene and perishable goods.
3. **Quantity cap** — cumulative returned quantity per line may never exceed the quantity sold. Compute
   from existing returns, not from a flag, so partial returns compose correctly.
4. **Refund amount** — the line's **effective price after its discount**, proportional to the quantity
   returned, plus its proportional VAT. Refunding the pre-discount price gives money away.
5. **Condition** — `RESELLABLE` restocks, `DAMAGED` does not. Mandatory per line.
6. **Reason** — mandatory per line, from a fixed list plus free text.
7. **Refund method** — cash refunds are limited to the cash currently in the drawer; if insufficient, the
   cashier must issue a credit note or use the original method.
8. **Voided sales cannot be returned.** A void already reversed everything.

---

## The return transaction

One transaction:

1. Load the original sale; verify it is `COMPLETED` and not voided.
2. Apply the window, category and quantity rules.
3. Compute the refund per line — discounted price plus proportional VAT.
4. Create the return `PosSale` (`isReturn = true`, negative amounts) and its lines.
5. Update `returnQuantity`, `returnReason`, `returnCondition` on the original lines.
6. Update the original sale's status to `RETURNED` / `PARTIALLY_RETURNED`.
7. Restock resellable lines through `StockService` (`type = RETURN`).
8. Execute the refund:
   - cash → `PosSalePayment` with negative amount; reduces expected drawer cash,
   - original method → Amwal refund via the MVP-07 adapter,
   - credit note → create `PosCreditNote` with `balanceAmount = refund`.
9. Reverse customer spend via `recordPurchase()` with a negative amount (visit count unchanged).
10. Write an audit row and a `pos.return.processed` outbox event.

---

## Credit note lifecycle

```
ACTIVE ──partial redemption──▶ ACTIVE (reduced balance)
   │                              │
   │                              └──balance reaches 0──▶ FULLY_REDEEMED
   ├──expiry date passes──▶ EXPIRED
   └──manually cancelled──▶ CANCELLED
```

- Redeemable **only by the issuing customer** — so a return that issues a credit note requires a customer
  on the original sale. A walk-in return must refund cash or original method.
- Partial redemption leaves the remaining balance available.
- Redemption happens inside the sale transaction (MVP-06), decrementing `balanceAmount` under a row lock so
  a note cannot be double-spent from two terminals.
- Expiry is optional (`expiresAt` nullable); a repeatable job marks lapsed notes `EXPIRED`.

---

## Exchange (9.3)

An exchange is **not** a distinct transaction type — it is a return plus a sale, linked by a credit note:

1. Process the return → credit note issued for the returned value.
2. Start a new sale, add the replacement items.
3. Apply the credit note as tender.
4. Collect the difference, or issue a further credit note if the new items cost less.

This is exactly the C1 exception in MVP-07 — credit note plus one other tender. Nothing further is needed
to support exchanges, which is why C1 exists.

---

## Permissions

```
pos.sale.return    pos.sale.return.override    pos.sale.credit-note
```

Grants: Cashier `return`. Store Manager adds `return.override` and `credit-note`. Administrator all.

---

## API

| Method | Route | Permission |
|---|---|---|
| GET | `/pos/sales/lookup?invoiceNumber=` — find the original | `pos.sale.return` |
| GET | `/pos/sales/:id/returnable` — lines with remaining returnable quantity and rule results | `pos.sale.return` |
| POST | `/pos/returns` — process a return | `pos.sale.return` |
| GET | `/pos/returns` — history | `pos.sale.read` |
| GET | `/pos/returns/:id` | `pos.sale.read` |
| GET | `/pos/credit-notes` — filters: customer, status | `pos.sale.credit-note` |
| GET | `/pos/credit-notes/lookup?number=` — register redemption path | `pos.sale.create` |
| POST | `/pos/credit-notes` — manual issuance | `pos.sale.credit-note` |
| POST | `/pos/credit-notes/:id/cancel` | `pos.sale.credit-note` |

`/pos/sales/:id/returnable` does the rule evaluation server-side and returns per line: remaining quantity,
whether the window has passed, whether the category permits return, and the refundable amount. The UI
renders that verdict rather than re-implementing the rules — the client must never decide eligibility.

---

## Web

```
apps/web/src/app/pos/returns/
├── page.tsx      → return history
├── new/page.tsx  → the return wizard
└── credit-notes/page.tsx → credit note list + balances
```

Return wizard: find invoice → select lines with quantity, reason, condition → choose refund method →
confirm → print return receipt.

Components in `features/products/pos/returns/`. Show the refund figure prominently and recompute it
server-side on every selection change — a cashier reading a stale number hands back the wrong money.

---

## Implementation steps

1. **Schema** — `PosCreditNote`, return fields on `PosSaleItem`, `returnable` on `PosCategory`,
   `returnWindowDays` / `receiptRequired` on `PosSettings`. RLS and grants.
2. **Return rules domain module** — pure, fully unit-tested before anything calls it.
3. **Credit note number sequence** — row-locked, gapless, mirroring the invoice sequence.
4. **Returnable-lines query** — remaining quantities plus rule verdicts.
5. **Return service** — the 10-step transaction above.
6. **Refund execution** — cash, Amwal via MVP-07, or credit note issuance.
7. **Credit note service** — lookup, redemption under a row lock, cancel, expiry job.
8. **Redemption integration** in MVP-06 checkout, honouring the C1 two-tender rule.
9. **Web** — wizard, history, credit note list.
10. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | Refund uses the discounted line price, not the gross |
| Unit | Proportional VAT on a partial-quantity return |
| Unit | Return window boundary — exactly on the last day passes, one day later fails |
| Unit | Non-returnable category rejected even with override permission |
| Unit | Cumulative returns cannot exceed quantity sold across several partial returns |
| Integration | Resellable restocks; damaged does not |
| Integration | Original sale becomes `PARTIALLY_RETURNED` then `RETURNED` |
| Integration | Return of a voided sale rejected |
| Integration | Credit note redeemable only by the issuing customer |
| Integration | Concurrent redemption of one credit note from two terminals: only one succeeds |
| Integration | Cash refund reduces expected drawer cash in the session |
| Integration | Customer `totalSpend` decreases, `visitCount` unchanged |
| Integration | Tenant isolation on returns and credit notes |
| E2E | Partial return → credit note → redeem on a new sale with cash remainder (the exchange path) |

---

## Done when

- A cashier can return part of an invoice, choose a refund method, and restock only resellable goods.
- Refund amounts respect the discounts originally given, to 3 decimals.
- A credit note cannot be spent twice, by anyone, from any terminal.
- Returns show as negative revenue so MVP-09's net figures need no special-casing.

---

## Open decisions

- **Walk-in credit notes** — a credit note needs a customer. Proposal: if a walk-in return cannot be paid
  in cash, require creating a minimal customer (quick-add) so the note has an owner. Confirm.
- **Credit note expiry** — proposal: none by default, tenant-configurable. Confirm.
- **Return receipt numbering** — proposal: returns consume the same invoice sequence (`INV-`) since they
  are sales, with `isReturn` distinguishing them. Alternative is a separate `RET-` series. Confirm — this
  affects VAT reporting layout.
