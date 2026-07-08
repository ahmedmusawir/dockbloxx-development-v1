# GUARDRAILS.md — Ticket 1 (hard rules) — v1.1

Updated after the live investigation. Rules 1–8 stand as written in v1.0. Rule 9 is
REVISED and Rules 10–11 are NEW.

## 1. Recon changes nothing
Phase 0 was read-only and is now complete. Evidence lives in EVIDENCE_ADDENDUM.md.

## 2. Removal is approval-gated
Unchanged. Applies now specifically to: the `hasTrackedPurchase` ref (replace only with
Tony's approval per Step A1) and anything GTM-related (which Claudy does not touch at
all — see Rule 10).

## 3. Current behavior is a hypothesis, not a fact
Resolved by evidence: the app sends the REAL order ID (E2); the compound IDs are minted
in GTM (E6). Do not "fix" the app's transaction_id — it is not broken.

## 4. Order ID vs order number
Confirmed: `orderResponse.id` (14873/14874/14875 observed) is the stable identifier in
use, and it is correct. Document it; do not change it.

## 5. Validate against the correct GA4 property only
Unchanged: 443304844 only. Never 495675373.

## 6. Staging/local-production is the proof surface
Unchanged. Analytics are production-gated; `next dev` fires nothing. Use the local
production build or staging, with GTM Preview + DebugView.

## 7. The lock must be keyed by order ID
Unchanged, and now implemented in Step A1. Validated by Test 1D (second legitimate
order must not be blocked).

## 8. Do not touch checkout behavior
Unchanged. Billing, shipping, line items, payment, coupon logic are off-limits.

## 9. Scope boundary — REVISED
Old rule said "GA4 only, this repo only." The corrected root cause splits ownership:

- **Claudy's scope = Track A only:** the thank-you page firing bug (lock + clear) inside
  this repo. Nothing else.
- **The transaction_id/ID-inflation fix = Track B, GTM container, owned by Tony with
  Coach's sign-off.** It is part of this ticket's solution but is performed OUTSIDE the
  repo, by a human, in Tag Manager.

## 10. NEW — Claudy never touches or compensates for GTM
Claudy does not edit GTM, does not add code that works around the container's ID
overwrite (no extra ID fields, no renamed events, no payload tricks), and does not
condition app behavior on container internals. If Track A is done and Track B is
pending, Claudy STOPS and reports — the ticket stays open until B1 is published, because
the Definition of Done (real Woo order ID in DebugView) is unreachable from the repo.

## 11. NEW — Adjacent findings are reported, not fixed
The user_signup/registration re-fire (E10) and the "GA4 - Thank you" element-visibility
event are logged findings. Claudy proposes; Tony decides whether they ride along or
become follow-ups. Same for anything else discovered mid-fix.
