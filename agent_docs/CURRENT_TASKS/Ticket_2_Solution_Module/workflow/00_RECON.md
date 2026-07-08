# workflow/00_RECON.md — Phase 0: Recon (Plan Mode, NO EDITS)

**Goal:** Establish the true current state of attribution plumbing before touching
anything. Produce evidence, fill `templates/RECON_FINDINGS.md` AND `templates/CONTRACT.md`,
then STOP for Tony's approval.

**Rules:** No code edits. No deletions. Read, search, trace, report. Label every finding:
**EVIDENCE** (observed in code), **INFERENCE** (reasoned), **CLAIM** (stated elsewhere,
unverified), **GAP** (unknown, needs a test or access), **QUESTION** (for Tony/Coach).

---

## Recon questions to answer

### A. The reader (what keys does checkout expect?)
- Find the attribution reader (expected: `src/lib/attribution.ts`, `getAttribution` /
  `cleanAttribution`). Report EXACTLY which storage keys it reads, storage type
  (localStorage vs sessionStorage vs cookie), and the key it uses for gclid (the old
  code may read gclid from `_cltk`).
- List every field the reader returns and the storage key each maps from.

### B. The consumer (how does the order-create payload get attribution?)
- Find where `StripePaymentForm` (or the checkout flow) calls the reader and attaches
  attribution to the order-create request. Report the exact shape it attaches.

### C. The forward point (what gets written to the Woo order today?)
- Find the order-creation route/handler. Report whether attribution is currently written
  as order meta, and under WHICH keys — coach-prefixed (`_coach_ghl_*`) or native
  (`_wc_order_attribution_*`) or not at all.
- Report the exact meta_data array shape sent to the WooCommerce orders endpoint.

### D. Capture (confirm it's gone, and where it should live)
- Confirm Coach's capture script is removed from the WP footer / not injected in the app.
- Confirm the reader currently reads EMPTY (nothing populates storage).
- Identify where a first-touch React provider should mount (root layout) and whether any
  provider scaffold already exists.

### E. The old script as reference
- If Coach's script exists in the repo as documentation, extract its capture + source-
  classification logic (UTM read, gclid/fbclid read, referrer inference, first-touch
  rule). Report the logic — do NOT plan to paste it.

### F. Native Woo attribution field requirements
- Report the exact native meta keys WooCommerce uses for order attribution
  (`_wc_order_attribution_utm_source`, `_medium`, `_campaign`, `_content`, `_term`,
  `_source_type`, `_referrer`) and the accepted values for `source_type`.
- Note: display in WP admin is OUT OF SCOPE; we only need these written so REST returns
  them.

### G. REST readback path
- Confirm how the order's meta_data reads back through the WooCommerce REST API
  (`/wp-json/wc/v3/orders/{id}`), and which credentials/endpoint the test will use on
  `dbp.dockbloxx.com` (staging).

### H. E2E race history
- Report HOW the old capture script raced the E2E suite, so the React-provider
  replacement avoids the same timing (e.g. it wrote storage on a timing that tests
  didn't expect).

---

## Output of this phase

1. Fill `templates/RECON_FINDINGS.md` — every finding evidence-labeled.
2. Fill `templates/CONTRACT.md` — the locked key map (capture → storage → reader →
   Woo meta → REST field). This is the deliverable that prevents silent-empty attribution.
3. State plainly: is the reader intact? Is the forward writing coach-prefixed or native?
   Is capture confirmed absent? What keys must the new capture write?
4. List GAPs needing a staging test or Coach input.
5. **STOP.** No edits until Tony approves BOTH filled templates.

## Stop Gate

> Recon complete. RECON_FINDINGS and CONTRACT filled and labeled. Headline answers stated
> (reader state, forward keys, capture absent, key map locked). Awaiting Tony's approval
> before any edits.
