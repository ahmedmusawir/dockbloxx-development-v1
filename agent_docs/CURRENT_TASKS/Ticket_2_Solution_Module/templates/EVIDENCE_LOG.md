# templates/EVIDENCE_LOG.md — Fill during Phase 2

Capture proof for the ClickUp ticket. Tony uses this to write the Coach report and close.

## Environment
- Staging URL tested:
- WooCommerce backend: dbp.dockbloxx.com
- Build / branch:
- Date/time:

## Test results

| Test | What it proves | Result | Evidence |
| ---- | -------------- | ------ | -------- |
| 1 Capture on landing | UTMs+clickIDs stored under contract keys | pass/fail | screenshot ref |
| 2 First-touch persist | survives navigation to checkout | pass/fail | screenshot ref |
| 3 No mid-visit overwrite | first-touch held | pass/fail | screenshot ref |
| 4 REST readback (CORE DoD) | attribution on order via REST | pass/fail | API excerpt ref |
| 5 Direct fallback | sane default, no crash | pass/fail | API excerpt ref |
| Regression | checkout unchanged | pass/fail | note ref |

## Tagged URL used
```
?utm_source=facebook&utm_medium=paid_social&utm_campaign=test_campaign&utm_content=test_ad&utm_term=test_kw&gclid=test-gclid-123&fbclid=test-fbclid-123
```

## Key values captured (from REST response)
- Woo order ID:
- _wc_order_attribution_utm_source:
- _wc_order_attribution_utm_medium:
- _wc_order_attribution_utm_campaign:
- _wc_order_attribution_utm_content:
- _wc_order_attribution_utm_term:
- _wc_order_attribution_source_type:
- gclid:
- fbclid:

## CONTRACT validation
- Traced field (e.g. utm_source = facebook) across all 5 columns end-to-end: pass/fail

## Attachments checklist (for ClickUp)
- [ ] Tagged staging URL
- [ ] Browser storage screenshot
- [ ] Woo order ID
- [ ] REST API response excerpt showing attribution meta
- [ ] Note: WP admin display intentionally out of scope

## Notes / anomalies
-
