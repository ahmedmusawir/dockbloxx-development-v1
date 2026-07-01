# workflow/00_RECON.md — Phase 0: Recon (Plan Mode, NO EDITS)

**Goal:** Establish the truth about how `purchase` currently reaches GA4, before touching
anything. Produce evidence, not fixes. Fill `templates/RECON_FINDINGS.md`, then STOP for
Tony's approval.

**Rules for this phase:** No code edits. No deletions. Read, search, trace, report. Label
every finding with one of: **EVIDENCE** (observed in code/config), **INFERENCE** (reasoned
from evidence), **CLAIM** (stated elsewhere, unverified), **GAP** (unknown, needs access
or a test), **QUESTION** (for Tony/Coach).

---

## Recon questions to answer

### A. Deployment path — where does purchase reach GA4?

- Is GA4 fed through **GTM** (container `GTM-KVFXFKQ8`), a **direct `gtag`** call in the
  app, or **both**?
- Locate the GTM loader. Is it injected in the Next.js app, in WordPress, or both? Which
  one loads on the actual storefront (the Next.js pages), not just WP-rendered pages?
- In GTM: is there a GA4 Event tag triggered by the `purchase` event? Is there also a
  thank-you-page URL trigger that could send `purchase` a second time?
- Is the same `purchase` event being sent to both property `443304844` and the duplicate
  `495675373`?

### B. Purchase source in the app

- Find the thank-you / order-confirmation page component. Identify the exact place
  `purchase` is dispatched.
- Find the tracking hook / `trackEvent` utility it calls. Confirm it pushes to `dataLayer`.
- Does dispatch happen on mount / in an effect? Would it re-run on refresh or
  back-navigation?

### C. Transaction ID — what value is used today?

- Report exactly what is passed as `transaction_id` and where it comes from.
- Is it the real WooCommerce order ID / order number, or a generated / timestamp value?
- Confirm whether WooCommerce order **ID** and order **number** are the same on this site,
  or whether a custom order-number plugin makes them differ.

### D. Existing guard

- Is there an "already tracked" guard today? What storage does it use (a React ref,
  a variable, sessionStorage, localStorage)?
- Does it survive a page refresh? A back-navigation? Or does it reset on remount?

### E. Order in client storage

- How is the finished order held for the thank-you page (e.g. localStorage `latestOrder`)?
- On remount, is that order re-read and would that re-trigger `purchase`?
- When is it cleared, if ever?

### F. Validation surface

- Where do analytics actually fire — is there a production-mode guard that suppresses them
  in local dev? Where is that guard?
- Confirm the staging URL and that DebugView is reachable on property `443304844`.

---

## Output of this phase

1. Fill `templates/RECON_FINDINGS.md` completely, every finding evidence-labeled.
2. State plainly: **which layer currently sends `purchase`**, **what ID it carries**, and
   **whether a second dispatch source exists**.
3. List any GAPs that need Tony's access or a staging test to close.
4. **STOP.** Do not proceed to Phase 1 until Tony approves the findings.

## Stop Gate

> Recon complete. Findings filled and labeled. The three headline answers (dispatch layer,
> transaction ID, duplicate source yes/no) are stated. Awaiting Tony's approval before any
> edits.
