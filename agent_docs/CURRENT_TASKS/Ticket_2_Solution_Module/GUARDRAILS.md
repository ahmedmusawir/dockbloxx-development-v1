# GUARDRAILS.md — Ticket 2 (hard rules)

Non-negotiable unless Tony explicitly overrides. Read before recon.

## 1. Recon changes nothing
Phase 0 is read-only. No edits, no deletions. Editing begins only after Tony approves the
recon findings AND the filled CONTRACT.md.

## 2. Do not change checkout behavior
Billing, shipping, line items, payment, coupon logic are OFF-LIMITS. This ticket adds
order METADATA only. The attribution payload rides alongside the existing order-create
body; it never alters it.

## 3. First-touch only — never overwrite
Capture writes attribution once per visit. If a value is already set for the visit, do
NOT overwrite it on later pages. Last-touch is wrong for this ticket.

## 4. The key contract is sacred (biggest silent-failure risk)
Capture, reader, order-write, and REST readback must all agree on key names. A single
mismatch produces EMPTY attribution with NO error. Before any code, fill CONTRACT.md and
get Tony's approval. The old contract doc and the live reader disagreed (dbx_ prefixes
vs un-prefixed, gclid via `_cltk`) — recon MUST resolve this, not guess.

## 5. Capture is a React provider, NOT an injected script
Do NOT re-add Coach's script to the WP footer or inject a raw script tag. That caused the
E2E test race that got it pulled. Capture is a first-touch React provider mounted in the
app. Do NOT reintroduce form injection, GHL iframe patching, polling, or URL decoration
from the old script — DockBloxx checkout needs none of it.

## 6. Coach's script is REFERENCE LOGIC ONLY
If the old script exists in the repo as docs, read it for the capture/classification
logic only. Do not paste it wholesale. Port only what this flow needs: read UTMs + gclid
+ fbclid from the entry URL, first-touch persist.

## 7. Native Woo attribution fields — write, don't chase the display
Write the native `_wc_order_attribution_*` meta (utm_source, utm_medium, utm_campaign,
utm_content, utm_term, source_type, referrer) plus gclid/fbclid as order meta. But the
DoD is REST API readback, NOT the WP Orders-screen display. If the admin "Origin" shows
Unknown after writing correct meta, STOP and report — do NOT spend time chasing WP admin
display. It is explicitly out of scope (operator decision).

## 8. Scope boundary — WooCommerce attribution ONLY
No GA4, no GTM, no analytics events, no sending UTMs to any analytics destination. GA4
enrichment is a possible FUTURE ticket, never part of this DoD. If you find analytics
issues, note them for Tony and move on.

## 9. Removal / replacement is approval-gated
If recon finds the old coach-prefixed write path, do NOT rip it out unilaterally. Report
it, propose whether to repoint or replace, and wait for Tony's decision — something
downstream (a GHL webhook, a report) may still read those keys.

## 10. Report adjacent findings, don't fix them
Anything discovered mid-work that isn't in this ticket's scope (e.g. the LeadConnector
console errors, leftover GHL plumbing) gets logged for Tony, not fixed here.
