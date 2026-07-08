# workflow/01_SOLUTION.md — Phase 1: The Fix (steps GATED on recon)

**Enter only after Tony approves the recon findings AND the filled CONTRACT.md.**

Every step below is written as conditional on recon. Where a step says
**[CONFIRM: …]**, that premise MUST be verified in Phase 0 before implementing. This is
deliberate — it prevents the mid-process rewrite problem. Do NOT hardcode an assumption
this file left open.

One change at a time. Checkpoint after each. No commits.

---

## Step 1 — First-touch capture (E2E-safe React provider)

- Create a first-touch attribution provider mounted in the app root layout (GUARDRAIL 5:
  React provider, NOT an injected WP script).
- On first load of the visit, read from the entry URL: `utm_source`, `utm_medium`,
  `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid`, and the landing page.
- Persist first-touch only (GUARDRAIL 3): if a value is already set for the visit, do not
  overwrite.
- **[CONFIRM: storage type + exact key names from CONTRACT.md]** — write the EXACT keys
  the reader expects (per the recon-locked contract), in the storage type the reader
  reads. This is the step that kills the silent-empty-attribution risk.
- **[CONFIRM: E2E timing]** — mount/write in a way that does not reproduce the old
  script's test race (per recon finding H).

**Checkpoint:** show Tony the provider, the keys written, and where it mounts. Await review.

## Step 2 — Reader reconciliation (only if recon found drift)

- **[CONFIRM: reader keys vs capture keys]** If recon found the reader reads keys the new
  capture doesn't write (or vice versa — e.g. gclid via `_cltk`, dbx_ prefixes), reconcile
  them so both sides use the CONTRACT.md key set.
- Prefer changing the NEW capture to match the existing reader (smaller blast radius),
  unless recon shows the reader itself is wrong. Claudy proposes; Tony decides.

**Checkpoint:** show Tony the reconciled key map in action. Await review.

## Step 3 — Forward to native Woo attribution meta

- **[CONFIRM: current forward keys from recon C]** In the order-creation path, write the
  attribution as order `meta_data` using the NATIVE keys
  (`_wc_order_attribution_utm_source`, `_medium`, `_campaign`, `_content`, `_term`,
  `_source_type`, `_referrer`) plus `gclid`/`fbclid` as order meta.
- **[CONFIRM: set source_type to a WooCommerce-accepted value]** per recon F.
- If recon found an existing coach-prefixed write path (`_coach_ghl_*`): do NOT rip it out
  (GUARDRAIL 9). Propose repoint-vs-replace to Tony and wait. Default: add the native keys;
  Tony decides whether the old keys stay for any GHL consumer.
- Add METADATA ONLY. Do not touch billing/shipping/line items/payment/coupon (GUARDRAIL 2).

**Checkpoint:** show Tony the meta_data array before/after. Await review.

## Step 4 — Direct-traffic fallback

- **[CONFIRM: chosen contract for empty attribution]** When no UTMs/click IDs are present,
  write a sane default (e.g. `source_type` = `typein`/`direct` per the value WooCommerce
  accepts) rather than empty/broken meta. Confirm the exact fallback contract with Tony.

**Checkpoint:** show Tony the direct-traffic behavior. Await review.

## Constraints throughout

- Append to existing files where possible; new files only when justified (the provider
  likely is a new file — that's fine).
- No GA4, no GTM, no analytics sends (GUARDRAIL 8).
- No commits. Tony reviews and commits.

## Stop Gate

> Fix implemented across approved steps, each reviewed. Capture writes contract keys,
> reader reconciled, order writes native meta, direct fallback set. Ready for Phase 2
> REST readback validation. Awaiting Tony's go.
