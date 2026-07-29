# templates/CONTRACT.md — The Attribution Key Map (Phase 0 filled 2026-07-08 · LOCKED-FINAL 2026-07-29)

**Status:** **LOCKED-FINAL.** All Phase 0 GAPs resolved by Coach's answers (folded 2026-07-29).
GAP-2 (source_type shape) RESOLVED = **WC enum**. GAP-3 (gclid history) closed as
informational. The five Tony decisions from 2026-07-08 are folded in below. Two prior
"Tony's call" items resolved: **KEEP** `landing_page`, **REMOVE** `attribution_captured_at`
in Phase 1. This document now governs Phase 1 implementation and Phase 2 validation.

**Rule of the contract:** columns 2 (capture writes) and 3 (reader reads) MUST be
identical strings per row. A single mismatch = silent empty attribution with no error.
Column 4 (order meta key) and column 5 (REST readback field) will typically also be the
same string — column 4 is what we write, column 5 is what we assert against in the
`meta_data` array returned by `GET /wp-json/wc/v3/orders/{id}`.

**Storage type (LOCKS COLUMNS 2 + 3 LIFETIME):** `sessionStorage`.
Rationale: matches the existing live reader in `src/lib/attribution.ts:29-37`, honors
first-touch-per-visit semantics (sessionStorage is per-tab-session, which is the correct
attribution scope — a returning visitor in a new session gets fresh first-touch), and
avoids localStorage cross-tab / cross-session leakage that would break attribution
accuracy.

---

## The Key Map

| Field                     | 1. URL param              | 2. Storage key (capture writes) | 3. Reader key (getAttribution reads) | 4. Woo order meta key                    | 5. REST readback field (meta_data entry `.key`)  |
| ------------------------- | ------------------------- | ------------------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------------ |
| UTM source                | `utm_source`              | `utm_source`                    | `utm_source`  ✅ matches today       | `_wc_order_attribution_utm_source`       | `_wc_order_attribution_utm_source`               |
| UTM medium                | `utm_medium`              | `utm_medium`                    | `utm_medium`  ✅ matches today       | `_wc_order_attribution_utm_medium`       | `_wc_order_attribution_utm_medium`               |
| UTM campaign              | `utm_campaign`            | `utm_campaign`                  | `utm_campaign`  ✅ matches today     | `_wc_order_attribution_utm_campaign`     | `_wc_order_attribution_utm_campaign`             |
| UTM content               | `utm_content`             | `utm_content`                   | `utm_content`  ✅ matches today      | `_wc_order_attribution_utm_content`      | `_wc_order_attribution_utm_content`              |
| UTM term                  | `utm_term`                | `utm_term`                      | `utm_term`  ⚠️ Phase 1 change (see notes) | `_wc_order_attribution_utm_term`     | `_wc_order_attribution_utm_term`                 |
| Source type               | (derived from URL + referrer) | `source_type`               | `source_type`  ⚠️ Phase 1 addition (reader has no row today) | `_wc_order_attribution_source_type` (**enum** — utm/organic/referral/typein) | `_wc_order_attribution_source_type` |
| Referrer                  | (`document.referrer`)     | `referrer`                      | `referrer`  ⚠️ Phase 1 addition       | `_wc_order_attribution_referrer`         | `_wc_order_attribution_referrer`                 |
| gclid                     | `gclid`                   | `gclid`                         | `gclid`  ⚠️ Phase 1 change from `_cltk` (GAP-3) | `gclid` (top-level order meta)  | `gclid`                                          |
| fbclid                    | `fbclid`                  | `fbclid`                        | `fbclid`  ✅ matches today           | `fbclid` (top-level order meta)          | `fbclid`                                         |
| wbraid                    | `wbraid`                  | `wbraid`                        | `wbraid`  ⚠️ Phase 1 addition         | `wbraid` (top-level order meta)          | `wbraid`                                         |
| gbraid                    | `gbraid`                  | `gbraid`                        | `gbraid`  ⚠️ Phase 1 addition         | `gbraid` (top-level order meta)          | `gbraid`                                         |
| Landing page              | (entry URL — `window.location.pathname`) | `landing_page`   | `landing_page`  ✅ matches today     | `landing_page` (top-level order meta)    | `landing_page`                                   |

**Click-ID naming decision (item 4 — recommendation, awaiting Tony to report to Coach):**
All four click IDs — `gclid`, `fbclid`, `wbraid`, `gbraid` — use **one canonical bare
string across all columns** (URL param = storage key = reader key = order meta key). **No
`_` prefix.** Rationale: (a) the contract's core identity rule is "same string per row";
the URL param names are bare (`gclid`, not `_gclid`), so bare keeps a single string end to
end and eliminates a mismatch surface; (b) it matches the already-locked bare treatment of
`gclid`/`fbclid`; (c) leading-underscore WordPress meta is "protected" (hidden from the
admin custom-fields box) — bare keys keep the four click IDs visible for forensic lookup.
These are top-level order meta, NOT `_wc_order_attribution_*` (click IDs are not part of
the native WC Order Attribution enum). **→ Final names for Coach: `gclid`, `fbclid`,
`wbraid`, `gbraid`.**

---

## CAT params (fallback twins of UTM) — SCOPE DELTA (item 5)

Coach's CAT params `cat_source`, `cat_medium`, `cat_campaign`, `cat_term`, `cat_content`
map into the **SAME native fields as their `utm_*` twins** — they do NOT get their own
storage keys, reader keys, or order-meta keys.

| CAT URL param  | Resolves into canonical field | Native order meta key (unchanged)     |
| -------------- | ----------------------------- | ------------------------------------- |
| `cat_source`   | `utm_source`                  | `_wc_order_attribution_utm_source`    |
| `cat_medium`   | `utm_medium`                  | `_wc_order_attribution_utm_medium`    |
| `cat_campaign` | `utm_campaign`                | `_wc_order_attribution_utm_campaign`  |
| `cat_term`     | `utm_term`                    | `_wc_order_attribution_utm_term`      |
| `cat_content`  | `utm_content`                 | `_wc_order_attribution_utm_content`   |

**Precedence: UTM wins when both are present; CAT is the fallback.** Resolution happens
**once at capture time** — the capture provider resolves utm-vs-cat per field and writes
the winner under the canonical `utm_*` sessionStorage key. Consequence: the reader and the
forward stay simple (they only ever see canonical `utm_*` keys) and no `cat_*` key appears
in columns 2–5. **`cat_source` alone (no `utm_source`) still sets `source_type = utm`** —
CAT presence counts as UTM presence for classification.

**Escape hatch (Coach):** if CAT resolution exceeds a small add, ship UTM-only and split
CAT into its own task. **This ship-vs-defer call is assessed in the Phase 1 plan**, not
here. (Early read: a per-field `utm_x || cat_x` fallback at capture is a few lines — likely
ships together — but the formal assessment lands in the Phase 1 plan for Tony's approval.)

---

## Reader changes required in Phase 1

To close columns 2↔3 identity on every row, `src/lib/attribution.ts` needs these edits
(all inside `getAttribution()` / the `AttributionData` interface):

1. **Line 33:** `utm_keyword: sessionStorage.getItem('utm_keyword') || sessionStorage.getItem('utm_term'),` → **`utm_term: sessionStorage.getItem('utm_term'),`** (canonicalize on `utm_term`; drop the `utm_keyword` fallback which was a form-field mapping legacy). [Locked decision 4]
2. **Line 34:** `gclid: sessionStorage.getItem('_cltk'), // Coach's script uses _cltk for click tracking` → **`gclid: sessionStorage.getItem('gclid'),`** (canonical URL-param-name key; matches new capture). [Locked decision 3]
3. **Add rows** the reader doesn't return today: `source_type`, `referrer`, `wbraid`, `gbraid` (each `sessionStorage.getItem('<key>')`).
4. **Rename the exported interface field** `utm_keyword` → `utm_term` in `AttributionData` (line 11). [Locked decision 4]
5. **Remove `attribution_captured_at`** (line 38 + interface) — resolved: it is not a real captured field. [Tony's-call item, now REMOVE]

`landing_page` and `coupon` reader behavior are unchanged (KEEP both).

---

## Forward changes required in Phase 1 (`src/lib/orderTransform.ts`)

1. **Delete the `_coach_ghl_*` write block** at `orderTransform.ts:170-174` (the
   `Object.entries(attribution).map(([key,value]) => ({ key: \`_coach_ghl_${key}\`, value }))`).
   We are off the GHL route. [Locked decision 2 — GUARDRAIL 9 gate cleared by Tony]
2. **Repoint to native writes** for every attribution field: emit
   `_wc_order_attribution_{utm_source,utm_medium,utm_campaign,utm_content,utm_term,source_type,referrer}`
   plus top-level `gclid`, `fbclid`, `wbraid`, `gbraid`, plus `landing_page`. Each written
   only when the cleaned attribution actually carries a value.
3. **Fix the `source_type` value** — it must be the enum the capture classified and
   persisted (read verbatim from attribution), NOT `attribution.utm_source || "direct"`
   (the current buggy logic at `orderTransform.ts:178`).

---

## Layout change required in Phase 1 (`src/app/layout.tsx`)

- **Delete the `<Script id="coach-attribution">` block** at `layout.tsx:85-89`. It injects
  empty content today (the ACF footer field is empty) — a no-op. [Locked decision 5 —
  GUARDRAIL 9 gate cleared]. The new capture is a `"use client"` React provider wrapping
  `{children}`, NOT an injected footer script (E2E-race avoidance, GUARDRAIL 5).

---

## Value contract notes (per row)

### Source type (Row 6) — GAP-2 RESOLVED = ENUM

**Column 4 carries a WC enum value**, NEVER a `utm_source` string, and is **never blank**.
Descriptive labels (`facebook`, `google`, …) live ONLY in
`_wc_order_attribution_utm_source`. Classification is done **once at capture**, persisted to
`sessionStorage['source_type']`, read back verbatim by the reader, and forwarded verbatim.

**Confirmed enum + derivation (Coach, verbatim — the former "proposed" Row 6 table, now locked):**
| Condition detected                                     | source_type value |
| ------------------------------------------------------ | ----------------- |
| Any `utm_*` param present (or `cat_*` twin) in landing URL | `utm`         |
| Referrer is a search engine (google/bing/…)            | `organic`         |
| Referrer is another external site (non-search)         | `referral`        |
| No referrer, no UTMs                                    | `typein`          |
| (WC-only, not app-driven)                              | `admin`, `mobile_app` — never emitted by us |

The old buggy value logic at `orderTransform.ts:178`
(`checkoutData.attribution.utm_source || "direct"`) is removed in Phase 1 (see Forward
changes above). Note the enum has **no `direct` member** — "no referrer, no UTMs" maps to
`typein`.

### Referrer (Row 7)

Capture reads `document.referrer` on landing; persists to `sessionStorage['referrer']`.
Empty string if same-origin or if referrer policy strips it — that's fine; the reader
returns null, `cleanAttribution` filters, and the forward simply doesn't write the meta.

### gclid (Row 8) — GAP-3 CLOSED (informational)

**Locked as `gclid` in both column 2 and column 3.** `_cltk` is dead. GAP-3 is closed as
informational per Coach — the answer only tells us whether the reader's old `_cltk` line
was broken since day one or since the script pull; either way the new capture is a clean
slate on `gclid`. Column 4 = top-level order meta key `gclid` (NOT
`_wc_order_attribution_gclid`; gclid is not part of the native WC enum).

### fbclid / wbraid / gbraid (Rows 9–11)

Same treatment as gclid — top-level order meta keys `fbclid`, `wbraid`, `gbraid` (bare,
see naming decision above). Captured first-touch when present; forwarded only when present.
`wbraid`/`gbraid` are Google's iOS/web-to-app click IDs (item 4 scope delta), completing
the four-ID set: `gclid`, `fbclid`, `wbraid`, `gbraid`.

### Landing page (Row 12) — KEEP (Tony's-call item resolved)

Captured as `window.location.pathname` on entry. Persisted first-touch. Written to
top-level order meta key `landing_page`. **KEEP** — negligible cost, forensic value.

---

## Fields NOT in the DoD contract but present in the reader today

| Field                     | Current reader behavior                                   | CONTRACT.md treatment                       |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| `coupon`                  | Reads `sessionStorage.getItem('coupon')` (line 36)        | KEEP — used by `ApplyCoupon.tsx:20-25` for QR-code coupon auto-fill. New capture MUST continue writing under `coupon`. NOT part of Woo attribution meta; do not forward. |
| `attribution_captured_at` | Computed at read time — `new Date().toISOString()` (line 38) | **REMOVE in Phase 1** (Tony's-call resolved). Not a real captured field; not part of DoD contract. |

---

## First-touch invariant (GUARDRAIL 3)

Capture MUST write each column-2 key ONLY if that key is absent from sessionStorage.
Pseudocode:

```
for each field in captured:
  if (sessionStorage.getItem(storageKey) == null && value != null):
    sessionStorage.setItem(storageKey, value)
```

No overwrites on later pages. No "last-touch wins." This is stated in the manager (§ 6),
GUARDRAIL 3, and ORIENTATION.md. (The utm-vs-cat precedence resolution happens BEFORE this
write, per-field, so what gets first-touch-persisted is already the resolved winner.)

---

## Validation checklist (Phase 2 uses this)

Trace one known value all the way across columns 1→5 to prove the contract holds.

**Canonical Phase 2 test URLs (Coach, item 6 — adapt host to staging
`dockbloxx.mystagingwebsite.com` per locked decision 1):**

```
Case A (full UTM + both click IDs):
https://dockbloxx.mystagingwebsite.com/?utm_source=facebook&utm_medium=paid_social&utm_campaign=summer_sale_2026&utm_content=carousel_a&utm_term=dock_bumper&gclid=TEST-GCLID-123&fbclid=TEST-FBCLID-456

Case B (google cpc + wbraid):
https://dockbloxx.mystagingwebsite.com/?utm_source=google&utm_medium=cpc&utm_campaign=brand&gclid=TEST-GCLID-123&wbraid=TEST-WBRAID-123
```

1. **Row 1 (UTM source), Case A, value `facebook`:**
   - Land on staging with Case A URL.
   - **Col 2 assert:** `sessionStorage.getItem('utm_source') === 'facebook'` in browser devtools on landing page.
   - **Col 3 assert:** at checkout, `getAttribution().utm_source === 'facebook'`.
   - **Col 4 assert:** the network POST to `/api/place-order` body's transformed order (via orderTransform's `meta_data`) includes `{key: '_wc_order_attribution_utm_source', value: 'facebook'}`.
   - **Col 5 assert:** `GET /wp-json/wc/v3/orders/{id}` response's `meta_data` array contains an entry with `.key === '_wc_order_attribution_utm_source'` and `.value === 'facebook'`.
   - If step 5 returns `facebook`, the contract holds for this row. Fill `EVIDENCE_LOG.md` accordingly.

2. **Row 6 (source_type), Case A:** assert Col 5 `_wc_order_attribution_source_type === 'utm'`
   (UTMs present). This is the row with active-logic transformation — most likely to reveal
   an enum-mapping mistake.

3. **Case B click ID:** assert Col 5 top-level `wbraid === 'TEST-WBRAID-123'` and
   `gclid === 'TEST-GCLID-123'`, and `_wc_order_attribution_source_type === 'utm'`.

4. **WP-admin visibility (SCOPE DELTA, item 3 — now part of DoD):** on the native WooCommerce
   order screen for the test order, the attribution box must render and show **Origin**
   (driven by `utm_source` + `utm_medium`) and **Source type** (the enum). Everything else
   remains REST-readback-only.
   - **Verify EARLY in Phase 2:** confirm a REST-created order renders the native attribution
     box AT ALL. **If it does not render, that is a finding to escalate to Tony — NOT something
     to silently work around** (GUARDRAIL 10: no compensating code for outside-repo config).
   - **typein orders (external-review FLAG 1):** verify Origin rendering for `typein` orders;
     screenshot; report to Coach. The `typein` + `utm_source='direct'` + `utm_medium='(none)'`
     combo may render oddly (e.g. "Direct: direct" or ignored utm_source). Do NOT change capture
     logic — observe and report.

---

## Open GAPs

**None blocking.** All Phase 0 GAPs are resolved:

- **GAP-2 (source_type enum):** RESOLVED = WC enum `{utm, organic, referral, typein}`,
  derivation per Row 6 table, never blank. (Coach, 2026-07-29.)
- **GAP-3 (gclid history):** CLOSED as informational — contract locks `gclid`; `_cltk` dead.
- **GAP-1 (staging host):** RESOLVED = `dockbloxx.mystagingwebsite.com` (locked decision 1);
  `dbp.dockbloxx.com` is PRODUCTION, off-limits for Phase 2.
- **GAP-4 (`_coach_ghl_*` consumers):** RESOLVED — delete the writes (locked decision 2).

**Remaining item for Tony to relay (not blocking):** confirm the four bare click-ID meta
key names (`gclid`, `fbclid`, `wbraid`, `gbraid`) so Coach can lock them downstream.
