# templates/CONTRACT.md — The Attribution Key Map (fill in Phase 0, validate in Phase 2)

This is the single source of truth for key names across every layer. A mismatch anywhere
= silent empty attribution. Every layer MUST agree. Fill during recon; Tony approves it
BEFORE any code; validate end-to-end during testing.

## How to read this table

Each row is ONE piece of attribution. The columns are the name that piece goes by at each
stage. They do not all have to be identical strings, but each layer must use the name in
its own column consistently, and the mapping between columns must be exact.

| Field        | 1. URL param | 2. Storage key (capture writes) | 3. Reader key (getAttribution reads) | 4. Woo order meta key | 5. REST readback field |
| ------------ | ------------ | ------------------------------- | ------------------------------------ | --------------------- | ---------------------- |
| UTM source   | utm_source   |                                 |                                      | _wc_order_attribution_utm_source   |          |
| UTM medium   | utm_medium   |                                 |                                      | _wc_order_attribution_utm_medium   |          |
| UTM campaign | utm_campaign |                                 |                                      | _wc_order_attribution_utm_campaign |          |
| UTM content  | utm_content  |                                 |                                      | _wc_order_attribution_utm_content  |          |
| UTM term     | utm_term     |                                 |                                      | _wc_order_attribution_utm_term     |          |
| Source type  | (derived)    |                                 |                                      | _wc_order_attribution_source_type  |          |
| Referrer     | (document.referrer) |                          |                                      | _wc_order_attribution_referrer     |          |
| gclid        | gclid        |                                 |                                      | (order meta, e.g. gclid)           |          |
| fbclid       | fbclid       |                                 |                                      | (order meta, e.g. fbclid)          |          |
| Landing page | (entry URL)  |                                 |                                      | (order meta, optional)             |          |

## Notes to resolve during recon

- **Storage type:** localStorage / sessionStorage / cookie? (Reader decides — match it.)
- **gclid key gotcha:** the old reader may read gclid from `_cltk`, not `gclid`. CONFIRM
  and record the actual reader key in column 3.
- **Prefix gotcha:** old contract doc used `dbx_` prefixes; live reader may not. Column 2
  must match column 3 EXACTLY.
- **source_type accepted values:** record the exact value WooCommerce accepts (e.g.
  `utm`, `referral`, `organic`, `typein`) so column 4 is valid.
- **utm_term vs utm_keyword:** the old script mapped utm_term → utm_keyword for forms.
  Decide the canonical name and record it; do NOT let term/keyword drift.

## Validation (Phase 2)

For at least one full field (recommended: utm_source), trace a known value
(`facebook`) all the way across columns 1→5 and confirm it survives unchanged into the
REST API response. If it does, the contract holds.
