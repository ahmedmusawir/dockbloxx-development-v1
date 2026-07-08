# templates/RECON_FINDINGS.md — Fill during Phase 0

Label every finding: **EVIDENCE** / **INFERENCE** / **CLAIM** / **GAP** / **QUESTION**.
Cite file and line where possible. Do not fix anything here. Also fill CONTRACT.md.

---

## Headline answers (fill first)
- **Is the reader intact and what keys does it read?** →
- **Does the forward write coach-prefixed or native (or nothing)?** →
- **Is capture confirmed absent (reader reads empty)?** →
- **What EXACT keys must the new capture write?** (→ CONTRACT.md) →

---

## A. Reader
- File / functions:
- Storage type (local/session/cookie):
- Keys read (list each field → key):
- gclid key (is it `_cltk`?):

## B. Consumer (checkout)
- Where the reader is called and attribution attached to the order payload (file:line):
- Shape attached:

## C. Forward point (order creation)
- Route/handler file:
- Attribution written today? keys used (coach-prefixed / native / none):
- meta_data array shape:

## D. Capture
- Coach's script removed from WP footer / not injected (confirm):
- Reader currently reads empty (confirm):
- Where a first-touch provider should mount:

## E. Old script (reference logic only)
- Location in repo (if present):
- Capture logic (UTM/gclid/fbclid read, referrer inference, first-touch rule):

## F. Native Woo attribution fields
- Exact meta keys:
- Accepted `source_type` values:

## G. REST readback
- Endpoint + how meta_data returns:
- Staging credentials/endpoint for the test:

## H. E2E race history
- How the old script raced the suite; how the provider avoids it:

---

## GAPs (need staging test or access)
-

## QUESTIONS for Tony / Coach
-
