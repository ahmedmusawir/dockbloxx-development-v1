# templates/EVIDENCE_LOG.md — Fill during Phase 2

Capture proof for the ClickUp ticket. Tony uses this to write the Coach report and close.

## Environment

- Staging URL tested:
- GA4 property confirmed: 443304844 (www.dockbloxx.com - GA4)
- Build / branch:
- Date/time of test:

## Test results

| Test | What it proves | Result | Evidence |
| ---- | -------------- | ------ | -------- |
| 1A Normal purchase | one purchase, real order ID, correct value/currency/items | pass/fail | screenshot ref |
| 1B Refresh | no duplicate on refresh | pass/fail | screenshot/note ref |
| 1C Back/forward | no duplicate on back-nav | pass/fail | screenshot/note ref |
| 1D Second order | lock is per-order, not global | pass/fail | screenshot ref |
| Regression | checkout unchanged | pass/fail | note ref |

## Key values captured

- WooCommerce order ID/number used (order 1):
- GA4 `transaction_id` observed (order 1):
- Match confirmed (yes/no):
- Order total vs GA4 `value` match (yes/no):

## Attachments checklist (for ClickUp)

- [ ] DebugView screenshot — single purchase
- [ ] Event parameters screenshot — transaction_id
- [ ] Woo order screenshot — same order ID + total
- [ ] Refresh proof
- [ ] Back-navigation proof
- [ ] Second-order proof
- [ ] Note: no Stape network calls observed

## Notes / anomalies

-
