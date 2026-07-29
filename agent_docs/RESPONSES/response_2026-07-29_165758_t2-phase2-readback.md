# T2 Phase 2 — REST readback: Case A + Case B PASS (core DoD)

**When:** 2026-07-29 16:57:58
**Status:** Case A (14887) + Case B (14888) readback PASS. typein PENDING order ID.
STOPPED for Tony's wp-admin visual checks + typein order ID.

## Method
`GET https://dockbloxx.mystagingwebsite.com/wp-json/wc/v3/orders/{id}` with WOOCOM creds.
Extracted `.meta_data` only (no billing PII into logs). Both responses `status=processing`.

## Case A — Order 14887 (facebook / full UTM + gclid+fbclid) — PASS
meta_data (verbatim): 9 entries —
`_wc_order_attribution_utm_source=facebook`, `_utm_medium=paid_social`,
`_utm_campaign=summer_sale_2026`, `_utm_content=carousel_a`, `_utm_term=dock_bumper`,
`_source_type=utm`, `gclid=TEST-GCLID-123`, `fbclid=TEST-FBCLID-456`, `landing_page=/`.
- 6 native + gclid + fbclid + landing_page. `referrer` absent (empty document.referrer → correct
  no-empty-write). NO wbraid/gbraid/coupon/`_coach_ghl_*`/`attribution_captured`. source_type verbatim.
- 14887 cross-checked = the facebook order (meta content matches the captured landing).

## Case B — Order 14888 (google/cpc + wbraid) — PASS
meta_data (verbatim): 7 entries —
`_wc_order_attribution_utm_source=google`, `_utm_medium=cpc`, `_utm_campaign=brand`,
`_source_type=utm`, `gclid=TEST-GCLID-123`, `wbraid=TEST-WBRAID-123`, `landing_page=/`.
- 4 native + gclid + wbraid + landing_page. NO content/term/referrer/fbclid/gbraid/coupon/
  `_coach_ghl_*`/`attribution_captured`. source_type verbatim.

## Cross-cutting proofs
- **Guard key `attribution_captured` NOT forwarded** to either order (verified absent) — stays internal.
- **Zero `_coach_ghl_*`** — legacy dormant plumbing confirmed gone.
- Full CONTRACT 1→5 trace holds for both captured field sets.

## typein — PENDING
Order ID not yet provided. On receipt: readback + assert `source_type=typein`, `utm_source=direct`,
`utm_medium=(none)`, `landing_page=/`, NO click IDs / campaign (atomic-fix proof). Fills Test 5.

## Findings logged (report-only, no T2 action)
- **Finding 2 addendum:** `_cltk` re-written to sessionStorage on EVERY landing incl. post-Clear-
  site-data (16:37) — legacy tracker LIVE, not residue.
- **Finding 3:** script-driven nav to Google `warmup.html` seconds after landing in incognito
  (not in clean profile). Suspected legacy-tracker/GTM-adjacent. Deferred to tracker-retirement ticket.
- Superseded runs updated: **14883 / 14884 / 14886**.

## Next
Tony: wp-admin visual checks (attribution box renders? Origin + Source type values? typein FLAG 1
rendering + screenshot) and hand over the typein order ID for the final readback.
