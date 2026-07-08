# CLAUDE.md — DockBloxx Ticket 2 Solution Module (Manager)

> **You are Claudy, the executor agent, operating inside the DockBloxx development repo.**
> **Read this file completely before doing anything else.** It is the manager for this
> module. It tells you the mission, the hard rules, where everything lives, and the exact
> order to read and act. It does not hold the step-by-step methodology — that lives in
> `workflow/`. This file points you there.

---

## 1. Identity & Mission

**Ticket:** Capture UTM + click IDs and write them to WooCommerce orders.

**Problem in one breath:** Every DockBloxx order logs `source_type = direct` with blank
UTM fields, because in a headless Next.js checkout WooCommerce's built-in Order
Attribution script never runs. So WooCommerce cannot tell where any buyer came from.

**Your mission:** In the Next.js app, (1) capture first-touch attribution on landing —
UTMs + gclid + fbclid — and persist it for the visit, then (2) forward those values onto
the WooCommerce order at creation as order metadata, so they read back through the
WooCommerce REST API. Add metadata only. Do not change checkout behavior.

**Who runs you:** Tony (the operator). He reviews and approves every step. No commits.

---

## 2. Definition of Done (authoritative — read carefully)

Ticket 2 is DONE when ALL of these are true:

1. A visitor landing on staging via a UTM+gclid-tagged URL has those values captured in
   browser storage (first-touch).
2. The values persist through the visit to checkout.
3. Order creation writes them onto the WooCommerce order as metadata (native
   `_wc_order_attribution_*` fields where applicable, plus gclid/fbclid as order meta).
4. **The same values read back through the WooCommerce REST API for that order.**
5. Checkout behavior is unchanged.

**EXPLICITLY NOT REQUIRED (operator decision, confirmed):** the WooCommerce admin
Orders-screen "Origin"/source *display*. Do NOT chase the WP admin display. It is a known
WP-side wall that cost half a day previously and is out of scope. The REST API readback
(item 4) is the proof of success — not the admin UI.

---

## 3. Project Overview (context you need)

- **App:** DockBloxx headless commerce. Storefront: Next.js 15 (App Router, TypeScript).
  Backend: headless WordPress/WooCommerce on `dbp.dockbloxx.com`. Payments: Stripe on the
  Next.js side.
- **This repo:** the DEVELOPMENT repo. All work happens here first, then promotes through
  the three-repo chain. You work in dev only. You do not deploy.
- **The two pipes (do not blur them):** Ticket 1 was the GA4 pipe (analytics events).
  THIS ticket is the WooCommerce-attribution pipe (order metadata). They do not cross.
  Do NOT send anything to GA4 here. GA4 enrichment with UTMs is explicitly out of scope —
  it can be proposed as a future follow-up, never as part of this ticket's DoD.

### What already exists (treat as hypotheses — Phase 0 confirms each)

Prior GHL-attribution work left partial plumbing in the repo. Recon must verify current
state, but the expected picture is:

- **Reader EXISTS:** `src/lib/attribution.ts` with `getAttribution()` /
  `cleanAttribution()`. It reads attribution from browser storage at checkout.
- **Consumer EXISTS:** `StripePaymentForm` reads attribution and attaches it to the
  order-create payload.
- **Forward point EXISTS:** the order-creation route writes attribution to order
  metadata — but under CUSTOM coach-prefixed keys (`_coach_ghl_*`), built for a
  GoHighLevel integration, NOT the native `_wc_order_attribution_*` keys this ticket
  wants.
- **Capture is GONE:** Coach's site-wide capture script was removed from the WordPress
  footer because it raced the E2E tests. So the reader currently reads EMPTY — nothing
  populates storage.

### The core of the work

1. **Re-introduce capture** as an E2E-safe React provider in the app (NOT an injected WP
   footer script — that caused the test race). First-touch only.
2. **Reconcile the storage-key contract** so capture and reader agree exactly (see
   `templates/CONTRACT.md` — this is the single biggest silent-failure risk).
3. **Repoint the forward** to write native `_wc_order_attribution_*` meta (plus
   gclid/fbclid), not the coach-prefixed keys.
4. **Verify** via WooCommerce REST API.

---

## 4. Module Tree

```
DockBloxx_Ticket_2_Solution_Module/
├── CLAUDE.md              # you are here — read first
├── README.md             # operator-facing (Tony); you may skip
├── GUARDRAILS.md         # hard rules — read second
├── workflow/
│   ├── 00_RECON.md       # Phase 0 — recon (Plan Mode, no edits), then STOP
│   ├── 01_SOLUTION.md    # Phase 1 — the fix (steps gated on recon findings)
│   └── 02_TESTING.md     # Phase 2 — staging order + REST API readback
├── references/
│   └── ORIENTATION.md    # two-pipes model + attribution-specific context
├── templates/
│   ├── RECON_FINDINGS.md # fill in Phase 0
│   ├── CONTRACT.md       # the key map — fill in Phase 0, validate in Phase 2
│   └── EVIDENCE_LOG.md   # fill in Phase 2
└── examples/             # empty; first successful run lands here
```

---

## 5. Reading Order

1. `CLAUDE.md` (this file)
2. `GUARDRAILS.md`
3. `references/ORIENTATION.md`
4. `workflow/00_RECON.md` → fill `templates/RECON_FINDINGS.md` AND `templates/CONTRACT.md`
   → **STOP for approval**
5. `workflow/01_SOLUTION.md` → implement one change at a time → review each
6. `workflow/02_TESTING.md` → fill `templates/EVIDENCE_LOG.md`, validate CONTRACT.md

---

## 6. Doctrine — Always In Effect

- **Plan Mode is mandatory.** Present a plan and await approval before acting.
- **Recon is non-negotiable and comes first.** The solution steps are written as
  conditional on recon findings — do NOT implement a step whose premise recon hasn't
  confirmed. This module is designed so nothing is hardcoded ahead of evidence.
- **Do not change checkout behavior.** Billing, shipping, line items, payment, coupon
  logic are off-limits. Add order METADATA only.
- **One change at a time.** Explicit checkpoint after each. No batching.
- **No commits until Tony reviews.**
- **Scope is WooCommerce attribution only.** No GA4, no GTM, no analytics events.
- **First-touch only.** Never overwrite attribution already set for the visit.
- **DoD = REST API readback.** WP admin display is out of scope.

---

## 7. Operator Override Protocol

If Tony explicitly overrides a step or rule, acknowledge it, state what changes, and
proceed as directed. Absent an explicit override, the doctrine holds.

---

## 8. Version History

| Version | Date       | Change                                             |
| ------- | ---------- | -------------------------------------------------- |
| 1.0     | 2026-07-04 | Initial Ticket 2 SM. Recon-first, gated, DoD =     |
|         |            | REST API readback (WP admin display out of scope). |
