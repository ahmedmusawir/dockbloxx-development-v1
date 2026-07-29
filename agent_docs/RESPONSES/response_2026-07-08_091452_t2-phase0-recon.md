# Ticket 2 Phase 0 Recon — Report

**Generated:** 2026-07-08 09:14 · **Author:** Claudy · **Branch:** `ticket-2-utm-to-rest`
**Deliverables filled:** `Ticket_2_Solution_Module/templates/RECON_FINDINGS.md` +
`Ticket_2_Solution_Module/templates/CONTRACT.md`
**Standing rules honored:** read-only, no edits to `src/`, no commits, no pushes.

---

## The four headline answers

### 1. Is the reader intact, and what EXACT keys does it read?

**YES — intact.** `src/lib/attribution.ts` (49 lines). Storage: **sessionStorage**.
Returns 9 fields plus a read-time-computed timestamp. Key map:

| Field                     | Storage key read                     |
| ------------------------- | ------------------------------------ |
| `utm_source`              | `utm_source`  (line 29)              |
| `utm_medium`              | `utm_medium`  (line 30)              |
| `utm_campaign`            | `utm_campaign`  (line 31)            |
| `utm_content`             | `utm_content`  (line 32)             |
| `utm_keyword`             | `utm_keyword` \|\| `utm_term`  (line 33 — fallback) |
| `gclid`                   | **`_cltk`**  (line 34)               |
| `fbclid`                  | `fbclid`  (line 35)                  |
| `coupon`                  | `coupon`  (line 36)                  |
| `landing_page`            | `landing_page`  (line 37)            |
| `attribution_captured_at` | computed `new Date().toISOString()`  (line 38 — NOT read from storage) |

**gclid is read from `_cltk`, NOT `gclid`.** This is the biggest silent-failure risk in
the current state. Three separate docs in the repo tell three different stories about
whether Coach's live script wrote `_cltk` or `gclid` (RECON_FINDINGS § A + § E). The live
reader picks `_cltk`; the archived Coach script in `docs/wp-plugins/attribution-script.md`
writes `gclid`. CONTRACT.md locks `gclid` as the single canonical answer regardless of
which version was live pre-pull — a one-line reader change in Phase 1 aligns it.

**Two consumers** of the reader (not just checkout):
- `src/components/checkout/payments/StripePaymentForm.tsx:75-89` (primary — order-create path)
- `src/components/checkout/right-pane/ApplyCoupon.tsx:8, 18-25` (adjacent — reads `attribution.coupon` for QR-code coupon auto-fill on mount)

### 2. Does the order-create forward path write coach-prefixed, native, or nothing?

**HYBRID today, mostly dormant coach-prefixed with ONE partial (and buggy) native write.**

`src/lib/orderTransform.ts:168-181` builds `meta_data` like this:

```typescript
meta_data: checkoutData.attribution
  ? [
      // Coach/GHL attribution fields
      ...Object.entries(checkoutData.attribution).map(([key, value]) => ({
        key: `_coach_ghl_${key}`,
        value: value,
      })),
      // WooCommerce Order Attribution - Origin field
      {
        key: "_wc_order_attribution_source_type",
        value: checkoutData.attribution.utm_source || "direct",
      },
    ]
  : [],
```

**Every attribution field** gets a `_coach_ghl_<field>` meta entry (line 171-174), PLUS
**one** native meta entry `_wc_order_attribution_source_type` (line 176-179).

**Two problems with the native write:**
1. Only 1 of the 7 native `_wc_order_attribution_*` keys is written (source_type). The
   other 6 (utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer) are
   NOT written at all.
2. The `source_type` VALUE is a utm_source string ("facebook", "google", …) OR the
   literal "direct" as fallback. Neither matches WC's expected `source_type` enum
   (`utm | referral | organic | typein | admin | mobile_app`). A latent bug that would
   surface even if capture were populated.

**gclid/fbclid** only appear in the `_coach_ghl_*` set (as `_coach_ghl_gclid` /
`_coach_ghl_fbclid`), never as top-level meta today.

**Downstream consumers of `_coach_ghl_*`:** per `agent_docs/CLEANUP_BACKLOG.md:44-55`,
"Production has no consumer (no Cyberize plugin, no GHL webhook). Code writes empty
meta to Woo orders on prod — harmless." Per GUARDRAIL 9, do NOT rip out unilaterally
in Phase 1 — surface to Tony as a decision.

### 3. Is capture confirmed gone (reader reads empty)?

**YES.** Two-part confirmation:

- `src/app/layout.tsx:85-89` still contains the `<Script id="coach-attribution">`
  injection tag, but its content is `footerJS` = ACF field
  `coach_attribution_scripts_footer` = **empty** per
  `agent_docs/CLEANUP_BACKLOG.md:30` ("Coach's attribution script removed"). The
  injection point exists, the payload is empty. **Effective no-op.**
- No React provider or client-side capture code exists in `src/` — grep returned zero
  raw-JS or TS matches for the script's telltale patterns (`utm_source.*sessionStorage`,
  `_cltk.*sessionStorage`, `dbx_utm`).

Combined: nothing writes UTM / gclid / fbclid keys to sessionStorage today. Every call
to `getAttribution()` returns 9 nulls + a fresh timestamp. `cleanAttribution` filters
everything except the timestamp. Every order today writes:
- `_coach_ghl_attribution_captured_at: "2026-07-08T…"` (one coach-prefixed meta, timestamp only)
- `_wc_order_attribution_source_type: "direct"` (from the falsy UTM fallback)

That is precisely the problem statement in T2's CLAUDE.md § 1: *"every DockBloxx order
logs `source_type = direct` with blank UTM fields."*

### 4. The filled CONTRACT.md table (capture ↔ reader per row)

Full table lives in `Ticket_2_Solution_Module/templates/CONTRACT.md`. Summary — columns
2 and 3 are now identical strings per row (the load-bearing invariant):

| Field         | Storage key (capture writes) | Reader key (getAttribution reads) | Match status               | Woo meta key                          |
| ------------- | ---------------------------- | --------------------------------- | -------------------------- | ------------------------------------- |
| UTM source    | `utm_source`                 | `utm_source`                      | ✅ matches today           | `_wc_order_attribution_utm_source`    |
| UTM medium    | `utm_medium`                 | `utm_medium`                      | ✅ matches today           | `_wc_order_attribution_utm_medium`    |
| UTM campaign  | `utm_campaign`               | `utm_campaign`                    | ✅ matches today           | `_wc_order_attribution_utm_campaign`  |
| UTM content   | `utm_content`                | `utm_content`                     | ✅ matches today           | `_wc_order_attribution_utm_content`   |
| UTM term      | `utm_term`                   | `utm_term`                        | ⚠️ Phase 1 reader change   | `_wc_order_attribution_utm_term`      |
| Source type   | `source_type`                | `source_type`                     | ⚠️ Phase 1 reader addition  | `_wc_order_attribution_source_type`   |
| Referrer      | `referrer`                   | `referrer`                        | ⚠️ Phase 1 reader addition  | `_wc_order_attribution_referrer`      |
| gclid         | `gclid`                      | `gclid`                           | ⚠️ Phase 1 reader change from `_cltk` | `gclid` (top-level order meta) |
| fbclid        | `fbclid`                     | `fbclid`                          | ✅ matches today           | `fbclid` (top-level order meta)       |
| Landing page  | `landing_page`               | `landing_page`                    | ✅ matches today           | `landing_page` (top-level order meta) |

**Reader edits required in Phase 1** (all confined to `src/lib/attribution.ts`, no cross-file coordination):
1. Line 33: replace `utm_keyword: … || utm_term` with `utm_term: sessionStorage.getItem('utm_term')`.
2. Line 34: replace `gclid: sessionStorage.getItem('_cltk')` with `gclid: sessionStorage.getItem('gclid')`.
3. Add `source_type: sessionStorage.getItem('source_type')` and `referrer: sessionStorage.getItem('referrer')`.
4. Rename interface field `utm_keyword` → `utm_term` (line 11).

**Storage type locked:** `sessionStorage` (matches live reader, honors per-visit first-touch semantics).
**First-touch invariant (GUARDRAIL 3):** capture writes each key ONLY if `sessionStorage.getItem(key) === null`. No overwrites on later pages.

---

## Open GAPs blocking full lock (marked, not guessed)

- **GAP-1: Staging URL for Phase 2 REST readback.** `dbp.dockbloxx.com` (T2 manager § 3)
  vs `dockbloxx.mystagingwebsite.com` (`.env.local.example`). Not resolvable from repo.
- **GAP-2: `source_type` accepted enum values.** WC's Order Attribution source enum —
  general-knowledge answer is `utm | referral | organic | typein | admin | mobile_app`.
  Not confirmed from repo alone. CONTRACT.md proposes a mapping (utm when UTMs present,
  organic when search referrer, referral when other external referrer, typein when no
  UTMs + no referrer) subject to Coach sign-off.
- **GAP-3: gclid history (`_cltk` vs `gclid`).** Informational only — the contract locks
  `gclid` regardless. But the answer tells us whether the reader's `_cltk` line has
  been broken since day one or only since the script pull.
- **GAP-4: Downstream consumers of `_coach_ghl_*` writes.** CLEANUP_BACKLOG says
  "Production has no consumer" but this predates recent WP-plugin changes. Confirm
  before proposing removal.

---

## Adjacent findings (report only per GUARDRAIL 10)

- **`_wc_order_attribution_source_type` value is buggy today.** `orderTransform.ts:178`
  stores utm_source strings ("facebook") under the source_type field, which WC expects
  as a fixed enum. Latent bug — fires only when capture populates something, which it
  currently doesn't.
- **`<Script id="coach-attribution">` in `layout.tsx:85-89` is a no-op** (empty content
  injected). Candidate for removal in Phase 1 pending Tony's call (GUARDRAIL 9).
- **`src/app/layout-org.tsx`** — backup/pre-refactor duplicate of `layout.tsx`. Not
  imported anywhere. Cleanup candidate, out of T2 scope.

---

## Questions for Tony / Coach (numbered for reply)

1. **Staging URL** (GAP-1). Which of `dbp.dockbloxx.com` / `dockbloxx.mystagingwebsite.com`
   is the Phase 2 REST readback surface?
2. **gclid convention** (GAP-3). Which Coach script version actually ran pre-pull — the
   `attribution-script.md` version (writes `gclid`) or an older `_cltk` version?
3. **`_coach_ghl_*` writes** (GAP-4). Any downstream still reading them? If not, Phase 1
   can decommission alongside the native re-point.
4. **`source_type` enum** (GAP-2). Confirm the WC enum, or point at the WC source file.
5. **`<Script id="coach-attribution">` in `layout.tsx`** — safe to remove during Phase 1,
   pending your call (GUARDRAIL 9).

---

## Where I stopped

- Both templates filled: `RECON_FINDINGS.md` (~230 lines, § A-H + GAPs + Questions) and
  `CONTRACT.md` (locked 10-row table + reader change list + first-touch invariant + Phase 2
  validation checklist).
- No files edited under `src/`. Two writes total: the two template files. Plus this
  response artifact.
- Task list #11-#19 completed; STOPPED per T2 workflow Stop Gate.
- **Awaiting your approval on BOTH templates** before I enter Phase 1 per
  `workflow/01_SOLUTION.md`. No commits, no pushes. Standing.
