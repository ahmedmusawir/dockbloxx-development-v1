# templates/EVIDENCE_LOG.md — Fill during Phase 2

Capture proof for the ClickUp ticket. Tony uses this to write the Coach report and close.

## Environment
- Frontend: http://localhost:3000 (local `npm run dev`)
- WooCommerce backend: https://dockbloxx.mystagingwebsite.com (STAGING, per locked decision 1 — NOT prod dbp.dockbloxx.com)
- REST auth: WOOCOM_CONSUMER_KEY/SECRET (validated, HTTP 200)
- Build / branch: `ticket-2-utm-to-rest` (Phase 1 + Finding 1 atomic fix; 221/221 tests, tsc 0)
- Date/time: 2026-07-29 (orders `date_created` 05:32 / 05:41 UTC per REST)
- Stripe: test mode (pk_test)

## Test results

| Test | What it proves | Result | Evidence |
| ---- | -------------- | ------ | -------- |
| 1 Capture on landing | UTMs+clickIDs stored under contract keys | **PASS** | Case A/B sessionStorage JSON below |
| 2 First-touch persist | survives navigation to checkout | **PASS** | captured values present in order meta at checkout |
| 3 No mid-visit overwrite | first-touch held (atomic) | **PASS** | atomic guard (Finding 1 fix) + unit tests; clean-run snapshots |
| 4 REST readback (CORE DoD) | attribution on order via REST | **PASS** (A=14887, B=14888) | verbatim meta_data below |
| 5 Direct fallback | sane default (typein), no crash | **PENDING** | typein order ID from Tony |
| Regression | checkout unchanged | **PASS** | orders created (status=processing); full suite 221/221 |

## Cases

### Case A — Order 14887 (facebook / full UTM + gclid+fbclid)
**Landing:** `/?utm_source=facebook&utm_medium=paid_social&utm_campaign=summer_sale_2026&utm_content=carousel_a&utm_term=dock_bumper&gclid=TEST-GCLID-123&fbclid=TEST-FBCLID-456`
**Captured sessionStorage (Col 2/3):**
```json
{ "utm_source":"facebook","utm_medium":"paid_social","utm_campaign":"summer_sale_2026","utm_content":"carousel_a","utm_term":"dock_bumper","source_type":"utm","gclid":"TEST-GCLID-123","fbclid":"TEST-FBCLID-456","landing_page":"/","attribution_captured":"1" }
```
**REST meta_data (Col 5) — verbatim, `GET /wp-json/wc/v3/orders/14887`:**
```json
[
  {"id":24317,"key":"_wc_order_attribution_utm_source","value":"facebook"},
  {"id":24318,"key":"_wc_order_attribution_utm_medium","value":"paid_social"},
  {"id":24319,"key":"_wc_order_attribution_utm_campaign","value":"summer_sale_2026"},
  {"id":24320,"key":"_wc_order_attribution_utm_content","value":"carousel_a"},
  {"id":24321,"key":"_wc_order_attribution_utm_term","value":"dock_bumper"},
  {"id":24322,"key":"_wc_order_attribution_source_type","value":"utm"},
  {"id":24323,"key":"gclid","value":"TEST-GCLID-123"},
  {"id":24324,"key":"fbclid","value":"TEST-FBCLID-456"},
  {"id":24325,"key":"landing_page","value":"/"}
]
```
**Verdict: PASS.** 6 native `_wc_order_attribution_*` + gclid + fbclid + landing_page = 9. `referrer` absent (empty document.referrer → no empty write, correct). NO wbraid/gbraid/coupon/`_coach_ghl_*`/`attribution_captured`. source_type=utm verbatim.

### Case B — Order 14888 (google/cpc + wbraid)
**Landing:** `/?utm_source=google&utm_medium=cpc&utm_campaign=brand&gclid=TEST-GCLID-123&wbraid=TEST-WBRAID-123`
**Captured sessionStorage (Col 2/3):**
```json
{ "utm_source":"google","utm_medium":"cpc","utm_campaign":"brand","source_type":"utm","gclid":"TEST-GCLID-123","wbraid":"TEST-WBRAID-123","landing_page":"/","attribution_captured":"1" }
```
**REST meta_data (Col 5) — verbatim, `GET /wp-json/wc/v3/orders/14888`:**
```json
[
  {"id":24328,"key":"_wc_order_attribution_utm_source","value":"google"},
  {"id":24329,"key":"_wc_order_attribution_utm_medium","value":"cpc"},
  {"id":24330,"key":"_wc_order_attribution_utm_campaign","value":"brand"},
  {"id":24331,"key":"_wc_order_attribution_source_type","value":"utm"},
  {"id":24332,"key":"gclid","value":"TEST-GCLID-123"},
  {"id":24333,"key":"wbraid","value":"TEST-WBRAID-123"},
  {"id":24334,"key":"landing_page","value":"/"}
]
```
**Verdict: PASS.** 4 native + gclid + wbraid + landing_page = 7. NO utm_content/utm_term/referrer/fbclid/gbraid/coupon/`_coach_ghl_*`/`attribution_captured`. source_type=utm verbatim.

### Case typein — Order [PENDING ID]
**Landing:** localhost:3000 hand-typed, no params, no referrer.
**Captured sessionStorage (Col 2/3):** utm_source=direct, utm_medium=(none), source_type=typein, landing_page=/, attribution_captured=1 — NO campaign/content/term, NO click IDs (atomic guard verified).
**REST meta_data:** _pending order ID._ Expected: `_wc_order_attribution_source_type=typein`, `_wc_order_attribution_utm_source=direct`, `_wc_order_attribution_utm_medium=(none)`, `landing_page=/`; NO click IDs, NO campaign — the atomic-fix proof in the meta.

## CONTRACT validation
- **Case A:** `utm_source=facebook` traced across all 5 columns (URL → sessionStorage → checkout → order meta → REST readback) end-to-end: **PASS** (all 9 fields match).
- **Case B:** `utm_source=google` + `wbraid` traced end-to-end: **PASS** (all 7 fields match).
- **Case typein:** PENDING order ID.
- **Guard key `attribution_captured` NOT forwarded** to either order — verified absent in meta_data.
- **Zero `_coach_ghl_*`** in either order — legacy plumbing confirmed gone.

## Relay to Coach (pending, post-Phase 2)
- **utm_campaign for untagged traffic (external-review FLAG 2):** campaign left empty for
  untagged traffic; old Coach script's `(organic)/(referral)` placeholder dropped as noise —
  flag if you want it restored.
- **Click-ID key names locked (bare):** `gclid`, `fbclid`, `wbraid`, `gbraid` (URL param =
  storage = reader = order-meta key, no `_` prefix). Confirm downstream.

## Attachments checklist (for ClickUp)
- [ ] Tagged staging URL
- [ ] Browser storage screenshot
- [ ] Woo order ID
- [ ] REST API response excerpt showing attribution meta
- [ ] Note: WP admin display intentionally out of scope

## Notes / anomalies
- classifyReferrer ported verbatim incl. substring-match looseness and unreachable
  bing.com/chat entry — tightening deferred as Coach-parity.
- Runs **14883 / 14884 / 14886 SUPERSEDED** — invalid (multi-landing session contamination
  during manual testing, before/around the atomic first-touch fix). Do not use as evidence.
  Valid runs: **14887 (Case A), 14888 (Case B)**, typein pending.
- **FINDING 1 (fixed 2026-07-29):** per-key first-touch produced chimera attribution across
  multiple landings in one session (a sparse typein/direct first touch later gap-filled with
  campaign + click IDs). Fixed with an atomic guard key `attribution_captured` — provider now
  captures the full snapshot once per visit or skips entirely. Tests added.
- **FINDING 2 (report-only, do NOT fix in T2 — GUARDRAIL 9/10):** a legacy attribution tracker
  is still active on the page — writes a parallel UTM set to **localStorage** (observed stale
  `utm_content="carou"`, full google/cpc set) and **`_cltk`** to sessionStorage. NOT our
  provider (ours is sessionStorage-only, code-verified). Candidate follow-up ticket — see
  CLEANUP_BACKLOG.
- **FINDING 2 addendum (2026-07-29 16:37):** `_cltk` is re-written to sessionStorage on EVERY
  landing, including after Clear-site-data — the legacy tracker is **LIVE, not residue**.
- **FINDING 3 (report-only, do NOT chase in T2):** script-driven navigation to a Google
  `warmup.html` observed seconds after landing in incognito windows; not reproduced in the
  clean profile. Suspected legacy-tracker / GTM-adjacent. Investigation deferred to the
  tracker-retirement ticket.
