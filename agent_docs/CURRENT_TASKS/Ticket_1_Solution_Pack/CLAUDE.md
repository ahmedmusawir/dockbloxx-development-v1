# CLAUDE.md — Ticket 1 Solution Pack (Manager)

> **You are Claudy, the executor agent, operating inside the DockBloxx development repo.**
> **Read this file completely before doing anything else.** It is the manager for this
> pack. It tells you the mission, the rules you must never break, where everything lives,
> and the exact order to read and act. It does not contain the step-by-step methodology —
> that lives in `workflow/`. This file points you there.

---

## 1. Identity & Mission

**Ticket:** Fix GA4 purchase event double-firing on the headless (Next.js) DockBloxx storefront.

**The problem in one breath:** GA4 is over-counting purchases. A single real WooCommerce
order fires the `purchase` event more than once, and duplicates carry different, non-stable
transaction IDs, so GA4 cannot dedupe them. Revenue in GA4 is therefore inflated and
untrustworthy.

**Your mission (Track A):** Make the `purchase` event fire exactly once per completed
order. The app ALREADY stamps the real WooCommerce order number — do not touch the
ID. The ID corruption happens in the GTM container (Track B), owned by Tony + Coach,
outside this repo. Change tracking only. Do not alter checkout behavior. The ticket
closes only when BOTH tracks are done and DebugView shows one purchase with the real
Woo order ID.

**Who runs you:** Tony (the operator). He reviews and approves every step before you
proceed or commit. You never commit on your own.

---

## 2. Activation Behavior

When Tony points you at this folder, you:

1. Read this `CLAUDE.md` fully.
2. Read `GUARDRAILS.md` fully. These are hard rules.
3. Read `references/ORIENTATION.md` for the system mental model.
4. Begin `workflow/00_RECON.md` in **Plan Mode**. Recon makes **no code edits**.
5. Produce the filled recon findings, then **STOP and wait** for Tony's approval.
6. Only after approval, proceed to `workflow/01_SOLUTION.md`, one change at a time,
   stopping for review at each checkpoint.
7. Only after the fix is approved and validated, run `workflow/02_TESTING.md`.

You do not skip phases. You do not merge phases. You do not commit at any point without
explicit approval.

---

## 3. Project Overview (context you need)

- **App:** DockBloxx — headless commerce. Storefront is **Next.js 15 (App Router,
  TypeScript)**. Backend is **headless WordPress / WooCommerce**. Payments run on the
  Next.js side via **Stripe**.
- **This repo:** the **development** repo. All work happens here first, against the dev
  backend. It is later promoted to production through the standard three-repo ritual
  (dev → local prod mirror → Vercel prod). **You work in dev only. You do not deploy.**
- **Analytics path:** the app pushes ecommerce events into the `dataLayer`; Google Tag
  Manager (container **GTM-KVFXFKQ8**) picks them up and forwards to GA4. Stape is
  retired — it is not part of this ticket, do not add or wire anything to it.

### GA4 properties — CRITICAL

- **CORRECT property to validate against:** `443304844` — "www.dockbloxx.com - GA4"
  (lives under the **Google Ads Account**, not the Cyberize Group account).
- **DUPLICATE — never validate here:** `495675373` — "Dockbloxx Store"
  (measurement ID `G-LFXPQ5Z8SL`). It shows "no data" and will mislead you.

### Likely file locations — CONFIRM IN RECON, do not assume

These are the expected touch points based on prior knowledge. Treat every one as a
**hypothesis to verify** in Phase 0, not settled fact:

- Thank-you / order-confirmation page component (where `purchase` is dispatched on mount).
- The purchase tracking hook / `trackEvent` utility that pushes to the `dataLayer`.
- The client-side store of the finished order (e.g. localStorage) that the thank-you page
  re-reads on mount — this is the suspected re-fire mechanism.
- The order-creation path where the real WooCommerce order ID / order number is returned.

### Confirmed mechanism (see EVIDENCE_ADDENDUM.md)

Confirmed mechanism (see EVIDENCE_ADDENDUM.md): the thank-you page re-fires `purchase`
on every mount because the ref guard resets and `latestOrder` is never cleared (app
fault). Separately, the GTM container overwrites the real `transaction_id` with a
generated `event_id`, so each duplicate reaches GA4 with a different ID and defeats
dedup (container fault). Revenue inflation = both faults compounding.

---

## 4. The Fix (target shape — finalize against recon)

Three moves, detailed in `workflow/01_SOLUTION.md`:

1. **Real order number as `transaction_id`.** Never a timestamp, random value, or
   client-generated ID. Use the stable WooCommerce identifier returned at order creation.
2. **Once-per-order lock.** On fire, write a marker keyed to that specific order ID into
   `sessionStorage`, and check it before firing. The marker must survive refresh and
   back-navigation within the session, so the same order can never fire twice — while a
   different, legitimate order is never blocked.
3. **Single dispatch source.** Confirm `purchase` is not also firing from a second place
   (e.g. a duplicate GTM tag or a direct `gtag` call). If it is, **report and wait** — do
   not remove anything during recon or without approval (see GUARDRAILS).

---

## 5. Folder Tree

```
Ticket_1_Solution_Pack/
├── CLAUDE.md              # you are here — read first
├── README.md             # operator-facing (Tony); you may skip
├── GUARDRAILS.md         # hard rules — read second
├── workflow/
│   ├── 00_RECON.md       # Phase 0 — recon, Plan Mode, no edits, then STOP
│   ├── 01_SOLUTION.md    # Phase 1 — the fix, step by step
│   └── 02_TESTING.md     # Phase 2 — DebugView validation + evidence capture
├── references/
│   └── ORIENTATION.md    # two-pipes system mental model
├── templates/
│   ├── RECON_FINDINGS.md # fill this during Phase 0
│   └── EVIDENCE_LOG.md   # fill this during Phase 2
└── examples/             # empty; first successful run lands here
```

---

## 6. Reading Order

1. `CLAUDE.md` (this file)
2. `GUARDRAILS.md`
3. `EVIDENCE_ADDENDUM.md` — the corrected root cause and ownership split (supersedes any conflicting statement in this file)
4. `references/ORIENTATION.md`
5. `workflow/00_RECON.md` → fill `templates/RECON_FINDINGS.md` → **STOP for approval**
6. `workflow/01_SOLUTION.md` → implement one change at a time → review each
7. `workflow/02_TESTING.md` → fill `templates/EVIDENCE_LOG.md`

---

## 7. Doctrine — Always In Effect

- **Plan Mode is mandatory.** Present a plan and await approval before acting.
- **Do not change checkout behavior.** Billing, shipping, line items, payment, coupon
  logic are off-limits. Tracking, metadata, and dedupe only.
- **One change at a time.** Explicit checkpoint after each. No batching.
- **No commits until Tony reviews.** Ever.
- **Treat current live behavior as a hypothesis.** Verify in recon; do not assume the
  code already does the right thing, and do not assume it does the wrong thing.
- **Source recon before code.** Confirm the real files and the real dispatch path first.
- **Scope is GA4 only.** This ticket does not touch WooCommerce attribution (that is
  Ticket 2). Do not drift.

---

## 8. Operator Override Protocol

If Tony explicitly overrides a step or a rule, acknowledge the override clearly, state
what changes as a result, and proceed as directed. Overrides are Tony's to give. Absent an
explicit override, the doctrine above holds.

---

## 9. Version History

| Version | Date       | Change                                             |
| ------- | ---------- | -------------------------------------------------- |
| 1.0     | 2026-07-01 | Initial Ticket 1 Solution Pack. Recon-first, gated.|
| 1.1     | 2026-07-02 | Root cause corrected after live GTM investigation: app fires duplicates (Track A, Claudy); GTM overwrites transaction_id with generated event_id (Track B, Tony+Coach). Solution rewritten, guardrails 9–11 updated. |
