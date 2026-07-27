# MVP-07 — Payment Processing

> **Spec sections**: 10.1 Payment Methods *(excluding Bank Transfer / NEFT / RTGS)* ·
> 10.3 Payment Gateway Integration *(Amwal Pay only)* · 10.4 Cash Management
> **Depends on**: MVP-06 Billing, MVP-05 Registers & Sessions
> **Blocks**: MVP-08 Returns (refunds reverse payments)
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: cash with change and denomination entry, card via EDC with manual reference capture, **Amwal Pay**
digital payments, cheque recording, credit-note redemption, cash in/out and drawer reconciliation.

**Excluded by instruction**: Bank Transfer / NEFT / RTGS — those are Indian rails and not used in Oman.
**Thawani Pay is also out** — Amwal only for the MVP, though the adapter port is built so Thawani drops in
later without restructuring.

**Out**: split payments / multi-tender (10.2), loyalty points as tender (7 is excluded, so this method is
not offered), custom payment methods beyond the fixed enum.

### Payment methods in the MVP

| Method | Status | Notes |
|---|---|---|
| `CASH` | ✅ | Change calculation, denomination entry |
| `AMWAL` | ✅ | Payment link / QR, webhook confirmation |
| `CREDIT_CARD` / `DEBIT_CARD` | ✅ | EDC terminal is **out-of-band**; POS records the approval reference only |
| `CHEQUE` | ✅ | Number, bank, date recorded |
| `CREDIT_NOTE` | ✅ | Redeemed against a balance issued by MVP-08 |
| `THAWANI` | ⛔ | Enum member exists; no adapter in MVP |
| `BANK_TRANSFER` | ⛔ | Excluded — not used in Oman |
| `LOYALTY_POINTS` | ⛔ | Loyalty (7) is out of MVP |
| `DUE` | ⛔ | Credit sales need 3.3 order-level handling; out of MVP |

### ⚠️ C1 — the one permitted exception to single-tender

10.2 is excluded, so a sale takes **one** tender. But a credit note (issued by MVP-08) rarely equals the
new bill, and the 9.3 exchange flow is impossible without a remainder tender.

**Decision**: `PosSalePayment` stays 1:N in the schema. The UI permits exactly two combinations:

1. one tender, or
2. `CREDIT_NOTE` **plus one** other tender for the remainder.

General N-way splitting is not built. The validation rule is "at most two payments, and if two, one must be
`CREDIT_NOTE`" — enforce it server-side, not only in the UI.

---

## Data model

| Model | Notes |
|---|---|
| `PosSalePayment` | `method`, `amount`, `referenceNumber`, `gatewayTransactionId`, `changeAmount`, `creditNoteId`, `chequeDetails Json` |
| `PosPaymentIntent` | Amwal session tracking: `saleDraftId`, `provider`, `providerRef`, `amount`, `status`, `rawPayload Json` |
| `PosWebhookReceipt` | Idempotent webhook log: `provider`, `eventId` unique, `payload`, `processedAt`, `status` |

`PosCashMovement` is defined and implemented in MVP-05 — cash in/out is a session operation.

### Why `PosPaymentIntent` exists

An Amwal payment is confirmed by a webhook that may arrive before, during or after the cashier finishes.
The intent row is created *before* the sale exists, carries the amount the gateway was asked to charge, and
is what the webhook matches against. Without it there is no safe way to correlate an asynchronous
confirmation with a cart that has not been committed yet.

---

## Amwal Pay integration

`apps/api/src/products/pos/payments/`

Implements the same port shape as the platform's `payment-provider.port.ts`, but as a POS-owned adapter
with POS-owned tables — subscription billing and customer checkout are different bounded contexts.

```ts
interface PosPaymentProcessor {
  createPaymentSession(amount: Decimal, metadata): Promise<{ providerRef, paymentUrl, qrPayload }>;
  getStatus(providerRef: string): Promise<PaymentStatus>;
  refund(providerRef: string, amount: Decimal): Promise<RefundResult>;
}
```

### Non-negotiables

1. **Amounts in baisa.** Amwal takes integers; 1 OMR = 1000 baisa. Convert with integer arithmetic at the
   adapter boundary. `Number(decimal) * 1000` is a rounding bug waiting to happen — use the `Decimal`
   API and produce an integer.
2. **`secureHashValue` on every request.** Computed server-side from the tenant's secret. The secret is
   never sent to the browser and never logged.
3. **Verify the webhook signature before trusting anything in it.** An unsigned or mis-signed callback is
   discarded and logged as a security event, not processed.
4. **Verify the amount matches the intent.** A signature proves origin, not that the customer paid what
   you asked. Compare against `PosPaymentIntent.amount` and reject mismatches.
5. **Idempotent webhooks.** `PosWebhookReceipt.eventId` is unique; a replayed callback is a no-op returning
   200. Gateways retry, and a retry must never create a second payment.
6. **Never complete a sale from client-side "success".** The browser saying payment succeeded is a claim,
   not a fact. Only a verified webhook — or an explicit server-side status poll — completes the sale.
7. **Per-tenant credentials** stored encrypted in POS settings, never in environment variables.

### Flow

```
Cashier selects Amwal
  → POST /pos/payments/intents  { amount, saleDraft }
  → adapter calls Amwal CreatePaymentLink (signed, baisa)
  → PosPaymentIntent PENDING; QR + link shown to customer
  → customer pays
  → Amwal → POST /pos/payments/webhook/amwal
      ├── verify signature        → else discard + log
      ├── check PosWebhookReceipt → else no-op if replayed
      ├── verify amount vs intent → else reject + alert
      └── intent → CONFIRMED
  → register (polling the intent) completes the sale via POST /pos/sales
```

If the webhook has not arrived when the cashier needs to move on, the sale is **not** completed. The
cashier retries the status check or falls back to another tender — never "complete anyway".

---

## Cash management (10.4)

Denomination entry, cash in/out and expected-versus-actual reconciliation are implemented in **MVP-05**,
since they are session operations. This area contributes only the payment-side pieces:

- **Change calculation** — `changeAmount = tendered − netAmount`, rejected if negative.
- **Denomination quick-buttons** in the cash dialog (exact, 5, 10, 20, 50 OMR) to cut keystrokes.
- **Cash tender feeds expected cash** — only `CASH` payments count toward the drawer; Amwal, card and
  cheque do not.

---

## Permissions

```
pos.payment.process    pos.payment.refund    pos.settings.payment
```

Grants: Cashier `process`. Store Manager adds `refund`. Administrator all, plus `settings.payment` for
gateway credentials.

---

## API

| Method | Route | Permission |
|---|---|---|
| POST | `/pos/payments/intents` — create an Amwal session | `pos.payment.process` |
| GET | `/pos/payments/intents/:id` — status poll for the register | `pos.payment.process` |
| POST | `/pos/payments/intents/:id/cancel` | `pos.payment.process` |
| POST | `/pos/payments/webhook/amwal` | **public**, signature-verified |
| POST | `/pos/payments/refund` — `{ saleId, amount, method }` | `pos.payment.refund` |
| GET/PUT | `/pos/settings/payments` — enabled methods, Amwal credentials | `pos.settings.payment` |

The webhook route is unauthenticated by necessity — it is called by Amwal, not by a user. It must therefore
be exempt from the tenant middleware and resolve its tenant from the intent record, be rate-limited, and
never leak whether a given reference exists.

---

## Web

Components in `features/products/pos/payments/`:

```
checkout-dialog.tsx        → method selection + amount summary
cash-payment-panel.tsx     → tendered, change, denomination quick-buttons
amwal-payment-panel.tsx    → QR + link + live status, cancel/retry
card-payment-panel.tsx     → manual approval-reference entry
cheque-payment-panel.tsx   → number, bank, date
credit-note-panel.tsx      → lookup by number, shows balance, applies
payment-settings-view.tsx  → enabled methods + credentials (admin)
```

The Amwal panel polls the intent every ~2 s with a visible timer and an explicit Cancel. It must never
auto-complete on a client-side assumption — completion follows the server's confirmed intent.

---

## Implementation steps

1. **Schema** — `PosSalePayment`, `PosPaymentIntent`, `PosWebhookReceipt`, with RLS and grants.
   `PosWebhookReceipt.eventId` unique per provider.
2. **Payment settings** — enabled methods + encrypted Amwal credentials in POS settings.
3. **Processor port** — `PosPaymentProcessor` and a `CashProcessor` (trivial, keeps checkout uniform).
4. **Amwal adapter** — signed link creation, status query, refund. Baisa conversion in one tested helper.
5. **Intent service** — create, poll, cancel, expire stale intents via a repeatable job.
6. **Webhook controller** — signature → receipt idempotency → amount check → confirm. In that order.
7. **Checkout integration** — payment validation inside MVP-06's transaction: payments sum to `netAmount`,
   at most two, and if two then one is `CREDIT_NOTE`.
8. **Refund service** — cash refunds immediate; Amwal refunds via the adapter; credit-note issuance is
   MVP-08's job, this exposes the mechanism.
9. **Web** — checkout dialog and the per-method panels.
10. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | OMR ↔ baisa conversion, including values like 0.005 and 1234.567 |
| Unit | Change calculation; negative tender rejected |
| Unit | `secureHashValue` computation against an Amwal fixture |
| Unit | Payment combination rule: 1 tender ok; 2 with credit note ok; 2 without rejected; 3 rejected |
| Integration | Unsigned webhook rejected and logged |
| Integration | Correctly-signed webhook with a mismatched amount rejected |
| Integration | Replayed webhook (same `eventId`) is a no-op, still 200 |
| Integration | Webhook arriving before the sale is created still confirms the intent |
| Integration | Sale cannot complete on an unconfirmed intent |
| Integration | Payments not summing to `netAmount` reject checkout |
| Integration | Gateway credentials never appear in any response |
| E2E | Cash sale with change → drawer expectation increases by the cash amount only |
| E2E | Amwal sale → simulated webhook → sale completes → receipt shows Amwal reference |

---

## Done when

- A cashier can take cash with correct change, or Amwal with QR and confirmed webhook.
- No sale completes on an unverified payment claim.
- Replayed or forged webhooks cannot create or confirm a payment.
- Only cash affects the drawer reconciliation in MVP-05.

---

## Open decisions

- **Amwal credential storage** — recommend encrypting at rest with the application key rather than storing
  plaintext in `PosSettings`. Needs a small crypto helper; confirm before step 2.
- **Intent expiry** — proposal: 15 minutes, then auto-cancel via repeatable job.
- **Card via EDC** — confirm the reference number is free text. If Omani acquirers issue a fixed format,
  validate it.
- **Cheque** — confirm cheques are accepted at the counter at all; if they are B2B-only they may belong
  with the excluded credit-sale flow rather than the register.
