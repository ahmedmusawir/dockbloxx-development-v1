# templates/RECON_FINDINGS.md — Fill during Phase 0

Label every finding: **EVIDENCE** / **INFERENCE** / **CLAIM** / **GAP** / **QUESTION**.
Cite the file and line where you can. Do not fix anything here.

---

## Headline answers (fill these first)

- **Which layer currently sends `purchase`?** (GTM tag / direct gtag / both) →
- **What `transaction_id` does it carry today?** (real order ID / order number / generated) →
- **Is there a second dispatch source?** (yes/no + where) →

---

## A. Deployment path

- GA4 fed via GTM / direct gtag / both:
- GTM loader location(s) (app / WP / both), which loads on the storefront:
- GA4 Event tag triggered by `purchase` in GTM (yes/no, details):
- Thank-you-page URL trigger present (yes/no):
- Same event sent to both 443304844 and 495675373 (yes/no):

## B. Purchase source in the app

- Thank-you / confirmation component (file):
- Exact dispatch location (file:line):
- Tracking hook / trackEvent utility (file):
- Fires on mount / effect (yes/no); would re-run on refresh/back (yes/no):

## C. Transaction ID

- Value passed as `transaction_id` and its source (file:line):
- Real Woo order ID/number or generated:
- Order ID vs order number the same on this site (yes/no; custom plugin?):

## D. Existing guard

- Guard present (yes/no), what storage (ref / var / session / local):
- Survives refresh (yes/no); survives back-navigation (yes/no):

## E. Order in client storage

- How the finished order is held (file, key):
- Re-read on remount and could re-trigger purchase (yes/no):
- When/if cleared:

## F. Validation surface

- Production-mode analytics guard location (file):
- Staging URL:
- DebugView reachable on 443304844 (yes/no):

---

## GAPs needing Tony's access or a staging test

-

## QUESTIONS for Tony / Coach

-
