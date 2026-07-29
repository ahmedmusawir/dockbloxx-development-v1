# templates/RECON_FINDINGS.md — Phase 0 Findings (2026-07-08)

Labels: **EVIDENCE** (observed in code), **INFERENCE** (reasoned), **CLAIM** (stated
elsewhere, unverified), **GAP** (unknown, needs a test or access), **QUESTION** (for
Tony/Coach). File:line citations everywhere possible.

Branch under recon: `ticket-2-utm-to-rest` (tip = merged `main` at `f4def81 Ticket 1 done`).
No files edited during recon.

---

## Headline answers

- **Is the reader intact and what keys does it read?**
  **YES — intact.** `src/lib/attribution.ts` (49 lines) exports `getAttribution(): AttributionData`
  and `cleanAttribution(): Record<string, string>`. Storage type: **sessionStorage** (line 24-38).
  Reads 9 fields under un-prefixed keys — but **gclid is read from `_cltk`** (line 34),
  which is the biggest silent-failure risk to lock in CONTRACT.md. Full key map in § A
  below. *(EVIDENCE)*

- **Does the forward write coach-prefixed or native (or nothing)?**
  **HYBRID.** `src/lib/orderTransform.ts:168-181` writes attribution as order `meta_data`:
  (a) one `_coach_ghl_<field>` key **for every attribution field** (line 171-174), plus
  (b) a **single** native `_wc_order_attribution_source_type` (line 176-179) with value
  `= attribution.utm_source || "direct"` — **the value logic is wrong** because
  `source_type` should be a WC enum (utm/referral/organic/typein/…), NOT a utm_source
  string like "facebook". Only 1 of the 7 native `_wc_order_attribution_*` keys is
  written today. gclid/fbclid are only carried as coach-prefixed. *(EVIDENCE)*

- **Is capture confirmed absent (reader reads empty)?**
  **YES.** No script is populating sessionStorage. Two-part confirmation:
  (a) `src/app/layout.tsx:85-89` still has the `<Script id="coach-attribution">` tag,
  but its `dangerouslySetInnerHTML` reads from `fetchTrackingScripts().footer` which
  reads the ACF field `coach_attribution_scripts_footer` on WP — that field is EMPTY per
  `agent_docs/CLEANUP_BACKLOG.md:30` ("Coach's attribution script removed"). Injection
  point exists, content is empty. *(EVIDENCE)*
  (b) No React provider or client-side capture code exists in `src/` — grep for the
  script's telltale patterns (`utm_source.*sessionStorage`, `_cltk.*sessionStorage`,
  `dbx_utm`) returns zero raw-JS or TS matches. *(EVIDENCE)*
  Combined: nothing writes `utm_*` / `gclid` / `fbclid` to sessionStorage today, so
  `getAttribution()` returns 9 nulls + a fresh timestamp; `cleanAttribution` filters
  everything except the timestamp; the order gets a single `_coach_ghl_attribution_captured_at`
  meta plus `_wc_order_attribution_source_type: "direct"`. *(INFERENCE — traceable from
  code)*

- **What EXACT keys must the new capture write?**
  See `templates/CONTRACT.md` (locked map). Summary: **un-prefixed keys matching URL
  param names, sessionStorage, gclid under key `gclid` (NOT `_cltk`)**. The reader must
  change one line to match (Phase 1). Full rationale in § A + § E below.

---

## A. Reader

- **File / functions:** `src/lib/attribution.ts:1-49`.
  - Line 23: `export function getAttribution(): AttributionData`
  - Line 45: `export function cleanAttribution(attribution): Record<string, string>` —
    filters `null`/`undefined`/`""`, returns a flat map. *(EVIDENCE)*
- **Storage type:** `sessionStorage` (line 24 SSR guard + lines 29-37 `sessionStorage.getItem` calls). *(EVIDENCE)*
- **Keys read (field → storage key):**
  | Field                     | Storage key                                        |
  | ------------------------- | -------------------------------------------------- |
  | `utm_source`              | `utm_source` (line 29)                             |
  | `utm_medium`              | `utm_medium` (line 30)                             |
  | `utm_campaign`            | `utm_campaign` (line 31)                           |
  | `utm_content`             | `utm_content` (line 32)                            |
  | `utm_keyword`             | `utm_keyword` \|\| `utm_term` (fallback) (line 33) |
  | `gclid`                   | **`_cltk`** (line 34) — see gclid note             |
  | `fbclid`                  | `fbclid` (line 35)                                 |
  | `coupon`                  | `coupon` (line 36)                                 |
  | `landing_page`            | `landing_page` (line 37)                           |
  | `attribution_captured_at` | computed at read time — `new Date().toISOString()` (line 38) — NOT read from storage |
  *(EVIDENCE)*
- **gclid key: is it `_cltk`?** YES in the live reader (line 34, comment "Coach's script
  uses _cltk for click tracking"). **BUT** the Coach script archived at
  `docs/wp-plugins/attribution-script.md:45` writes gclid under key `gclid`, not
  `_cltk`. This is the silent-failure trap: if the archived script represents what
  actually ran in production, the reader was NEVER seeing gclids anyway; if a different
  Coach script version was live that DID use `_cltk`, the archived script in the repo
  is a stale sample. Either way, the new capture MUST agree with the reader on a single
  key — CONTRACT.md picks `gclid` for both, requiring a one-line reader change in
  Phase 1. *(EVIDENCE + QUESTION for Coach on which version was actually live pre-pull)*
- **SSR-safe:** returns `{}` on `typeof window === 'undefined'` (line 24-26). *(EVIDENCE)*
- **Two consumers**, not just checkout:
  - `src/components/checkout/payments/StripePaymentForm.tsx:15` (primary — order-create path)
  - `src/components/checkout/right-pane/ApplyCoupon.tsx:8` — reads `attribution.coupon`
    for QR-code coupon auto-fill on mount (lines 18-25). Adjacent feature, NOT the T2
    forward path but SHARES the reader. Capture must continue populating `coupon` under
    key `coupon` to keep this working. *(EVIDENCE)*

## B. Consumer (checkout)

- **Call site:** `src/components/checkout/payments/StripePaymentForm.tsx:75-89` inside
  `handleSubmit`. Sequence: `const attribution = getAttribution()` → `cleanAttribution(attribution)`
  → spread into `orderPayload` under key `attribution` → `await createWoocomOrder(orderPayload)`.
  *(EVIDENCE)*
- **Shape attached:** `{ ...checkoutData, attribution: cleanedAttribution }` — attribution
  rides alongside existing checkout body under top-level `attribution` field. Debug log at
  line 78-80 (`"📊 [StripePaymentForm] Attribution data:"`). *(EVIDENCE)*
- **createWoocomOrder** (`src/services/orderServices.ts:15-32`) POSTs to
  `/api/place-order` (Next.js API route), which forwards to WC REST via
  `buildOrderData()`. Attribution never rides raw over the wire to WP — it hits the
  Next.js API first, gets transformed into order meta_data there. *(EVIDENCE)*

## C. Forward point (order creation)

- **Route:** `src/app/api/place-order/route.ts` (100 lines). POST handler at line 17.
  Parses body as `CheckoutData`, calls `buildOrderData(checkoutData)` (line 34), validates
  required fields, POSTs to `${WC_REST_URL}/orders?consumer_key=…&consumer_secret=…`. *(EVIDENCE)*
- **Transformation:** `src/lib/orderTransform.ts:51-208`. The attribution block is
  lines 166-181. *(EVIDENCE)*
- **Attribution written today — under which keys?** BOTH coach-prefixed AND partial native:
  - **Coach-prefixed (dominant):** `orderTransform.ts:170-174` — `Object.entries(attribution).map(([key, value]) => ({ key: \`_coach_ghl_${key}\`, value }))`. Every field of `checkoutData.attribution` gets one `_coach_ghl_<field>` meta entry.
  - **Native (single, buggy value):** `orderTransform.ts:175-179` — one entry, `{ key: "_wc_order_attribution_source_type", value: checkoutData.attribution.utm_source || "direct" }`. The value logic assigns the utm_source string (e.g. "facebook") to source_type, which should carry a WC enum value (utm/referral/organic/typein/etc.). This is a **latent bug** even if capture were populated — it would write the wrong shape of value into source_type. *(EVIDENCE + INFERENCE)*
  - **Zero native writes for the other 6 fields** (utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer). *(EVIDENCE)*
  - **gclid/fbclid** only appear as `_coach_ghl_gclid` / `_coach_ghl_fbclid`. Not written as top-level order meta under their own keys. *(EVIDENCE)*
- **meta_data array shape:** `Array<{ key: string; value: unknown }>` — declared in
  `OrderData.meta_data` interface at `orderTransform.ts:48`. WC standard shape. *(EVIDENCE)*
- **Comment context** at `orderTransform.ts:166-167`: "Attribution data for GHL
  integration (Coach's script). Plumbing preserved even though the feature is currently
  dormant — see CLEANUP_BACKLOG.md." Confirms the coach-prefixed writes are INTENTIONALLY
  dormant, not accidentally live. *(EVIDENCE)*
- **CLEANUP_BACKLOG.md:44-55** confirms the GHL feature is "deprecated; plumbing left
  intact in code" and "Production has no consumer (no Cyberize plugin, no GHL webhook)".
  So the coach-prefixed keys are dead-write today — nothing reads them downstream. Per
  GUARDRAIL 9, do NOT rip out unilaterally; report + wait for Tony's decision. *(EVIDENCE)*

## D. Capture

- **Coach's script removed from WP footer / not injected:** CONFIRMED.
  - `src/app/layout.tsx:85-89` still has `<Script id="coach-attribution" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: footerJS }}>`, where `footerJS` is `fetchTrackingScripts().footer` which reads the ACF field `coach_attribution_scripts_footer` (`src/services/trackingSeoServices.ts:19`).
  - The ACF field is EMPTY per `agent_docs/CLEANUP_BACKLOG.md:30` ("Coach's attribution script removed"). Result: `footerJS` is an empty string, `stripScriptWrapper("")` returns `""`, the `<Script>` tag mounts with empty content. **No-op.** *(EVIDENCE + INFERENCE)*
  - The `<Script id="coach-attribution">` tag itself is now visual noise. Removal is a **Phase 1 decision** — per GUARDRAIL 9, report + wait for Tony's call rather than unilateral rip.
- **Reader currently reads empty:** CONFIRMED by construction. Nothing writes UTM/gclid/fbclid keys to sessionStorage; reader `getAttribution()` will return 9 nulls + a fresh timestamp; `cleanAttribution` filters everything except the timestamp. *(INFERENCE — from EVIDENCE above)*
- **Provider mount location:** wrap `{children}` in `src/app/layout.tsx:71-73`. Layout is a Server Component; the provider itself will be `"use client"`. Mounting once at layout scope guarantees the effect runs on the entry mount (first URL a visitor lands on) and only there — perfect for first-touch semantics. No existing provider scaffold in `src/app/` (grep for `Provider` in `src/app/` only hits the `layout-org.tsx` backup file's JSDoc comment; no live consumer). *(EVIDENCE + INFERENCE)*
- **`src/app/layout-org.tsx` is inert** (backup/pre-refactor copy; not imported anywhere per earlier Ticket 1 recon). Not touched here. *(EVIDENCE)*

## E. Old script (reference logic only)

- **Location(s):**
  - `docs/wp-plugins/attribution-script.md` — 199-line archived Coach script.
  - `docs/wp-plugins/cyberize-attribution.php` — WordPress plugin ("Cyberize Attribution") that CONSUMES attribution and forwards to GHL webhook. Not our concern (WP-side, downstream).
  - `docs/ghl-attribution/*.md` — architectural docs from the GHL era (README, FRONTEND-CONTRACT, GHL-WORKFLOW-CONTRACT, GHL_ATTRIBUTION_SESSION, WP-PLUGIN-CONTRACT).
- **Capture logic (extracted from `attribution-script.md`):**
  - Line 45: `KEYS = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid","coupon","landing_page"]` — **9 keys, all un-prefixed**.
  - `parseQuery()` (lines 47-82): parses URL query, then falls back to `classifyTraffic()` if `utm_source` is missing. First-touch on `landing_page` only via `if (!sessionStorage.getItem('landing_page'))` at line 77.
  - `classifyTraffic()` (lines 6-41): infers source+medium from `document.referrer`:
    - **AI**: chatgpt/openai/claude/gemini/bard/bing.com/chat → `{source: <domain>, medium: 'ai-referral'}`
    - **Social**: facebook/twitter/x.com/linkedin/instagram/pinterest/reddit/tiktok/youtube → `{source: <normalized>, medium: 'social'}`
    - **Search**: google/bing/yahoo/duckduckgo/baidu/ecosia → `{source: <domain>, medium: 'organic'}`
    - **Referral (fallback)**: `{source: <domain>, medium: 'referral'}`
    - **No referrer + no prior session**: `{source: 'direct', medium: '(none)'}`
  - **First-touch persist** at line 86: `KEYS.forEach(function(k){ if (incoming[k]) sessionStorage.setItem(k, incoming[k]); });` — the `if (incoming[k])` gate means fresh values overwrite, BUT `parseQuery` only puts values in `incoming` if the URL had them OR (for landing_page/utm_source) if storage didn't already have them. Effectively first-touch for landing_page and the classification path; last-touch for explicit URL params. **Nuance to lock down** in Phase 1 — the new provider should be strictly first-touch for ALL fields to honor GUARDRAIL 3.
  - Side effects that raced E2E (see § H): `decorate()` (lines 92-123 — `history.replaceState` + href rewriting on internal `<a>`), `populateFields()` (lines 126-154 — form field injection), `patchGHLIframes()` (lines 156-179 — GHL widget iframe URL rewriting), `setInterval` polling every 500ms up to 10 tries (lines 192-196).
  - **The new React provider must NOT do any of these DOM side effects.** URL params → sessionStorage → done. This is stated in GUARDRAIL 5.
- **KEY MISMATCH IN DOCS (silent-failure trap):**
  - `attribution-script.md:45` writes gclid under key `gclid`.
  - `GHL_ATTRIBUTION_SESSION.md:21` says "Reads Coach's script keys: … `_cltk` (gclid)".
  - `attribution.ts:34` reads `_cltk`.
  - `FRONTEND-CONTRACT.md:37-45` claims `dbx_` prefixes on all keys.
  - **Three different key stories in the same repo.** Not resolvable from the repo alone.
    Live reader wins for what checkout expected; but the reader may have been coded
    against a different Coach script version than what's archived in the repo. Marking
    this as a QUESTION for Coach (which version actually ran pre-pull?) — CONTRACT.md
    locks a single canonical answer regardless (`gclid` under key `gclid`, no `dbx_`).
    *(EVIDENCE + QUESTION)*

## F. Native Woo attribution fields

- **Exact meta keys (all under order `meta_data`):** `_wc_order_attribution_utm_source`,
  `_wc_order_attribution_utm_medium`, `_wc_order_attribution_utm_campaign`,
  `_wc_order_attribution_utm_content`, `_wc_order_attribution_utm_term`,
  `_wc_order_attribution_source_type`, `_wc_order_attribution_referrer`. Plus optional
  session-context fields WC also uses natively (session_entry, session_start_time,
  session_pages, session_count, user_agent, device_type) — NOT required for T2 DoD.
  *(INFERENCE from general WC Order Attribution knowledge, corroborated by
  `docs/ghl-attribution/GHL_ATTRIBUTION_SESSION.md:40,64,73` mentioning the same
  `_wc_order_attribution_source_type` key.)*
- **Accepted `source_type` values:** **PARTIAL EVIDENCE / GAP.** WC's Order Attribution
  source (from general knowledge) accepts: `utm`, `referral`, `organic`, `typein`,
  `admin`, `mobile_app`. This is not confirmed from anything in this repo alone. The
  in-repo hints (`GHL_ATTRIBUTION_SESSION.md:73` shows `source_type: google` as an
  example, which is WRONG — that's a utm_source, not a source_type; and
  `workflow/01_SOLUTION.md:57` writes "sane default e.g. `source_type` = `typein`/`direct`
  per the value WooCommerce" — author uncertainty acknowledged). **GAP to close via WC
  docs or a quick WC source lookup during Phase 1 planning.** *(GAP + partial CLAIM)*
- **Display in WP admin: OUT OF SCOPE** per manager § 2 + GUARDRAIL 7. Recon does not
  chase; if Phase 2 shows admin "Origin" says Unknown while REST returns correct meta, STOP and report.

## G. REST readback

- **Endpoint:** `GET {WC_REST_URL}/orders/{id}` — where `WC_REST_URL = getApiUrl("/wp-json/wc/v3")` (`src/constants/apiEndpoints.ts:3`).
- **`getApiUrl` prefixes** with `NEXT_PUBLIC_BACKEND_URL` (`src/lib/utils.ts:47`).
- **Auth:** query-param `?consumer_key=…&consumer_secret=…` per the existing POST path at `src/app/api/place-order/route.ts:52`. Confirmed for POST; same shape works for GET on WC REST.
- **`meta_data` returns as `Array<{ id: number, key: string, value: unknown }>`** on WC REST responses (standard WC 8.x shape). Phase 2 test asserts by `.find(m => m.key === "…")?.value`. *(INFERENCE from general WC REST knowledge)*
- **Staging URL — CONFLICT / GAP:**
  - `.env.local.example` shows `NEXT_PUBLIC_BACKEND_URL=https://dockbloxx.mystagingwebsite.com` (also used by T1 recon).
  - T2 manager `CLAUDE.md § 3` says "backend WordPress/WooCommerce on `dbp.dockbloxx.com`".
  - Two candidate hosts. `dbp.dockbloxx.com` is not present in any `.env*` example or in the repo. **QUESTION for Tony:** which is the correct staging surface for Phase 2 REST readback? (One likely explanation: `dockbloxx.mystagingwebsite.com` is dev-staging, `dbp.dockbloxx.com` is a new/prod-mirror staging that supersedes the older env-example URL. But that's speculation.)
- **Credentials for Phase 2 test:** `WOOCOM_CONSUMER_KEY` + `WOOCOM_CONSUMER_SECRET` in `.env.local`. Values redacted in the example file. Tony to confirm the pair is valid against whichever staging URL is chosen. *(GAP — access, not code)*

## H. E2E race history

- **Documented in `agent_docs/TESTING_PLAYBOOK.md:1524-1530`** (§ G11 "Third-party scripts at root layout race E2E click navigation"). Diagnostic signal called out: "the same click-navigation flake reproduces on multiple unrelated routes that share only a layout-level script."
- **Root cause (from `docs/wp-plugins/attribution-script.md:107-122`):** Coach's script called
  ```
  window.history.replaceState({}, "", window.location.pathname + "?" + sp);
  ```
  on load (line 108) and rewrote the `href` of every internal `<a>` (lines 112-120):
  ```
  var links = document.querySelectorAll("a[href]");
  for (var i=0; i<links.length; i++) {
    ... url.searchParams.set(k, urlParams[k]); ...
    links[i].setAttribute("href", url.pathname + "?" + url.searchParams.toString());
  }
  ```
  Playwright's click landed on a link whose `href` had just been mutated (or was about to be) — click navigated to the OLD href but the URL bar / next-hop expectation had shifted. Timing-dependent flake across every route with links. Additionally, a `setInterval(wireUp, 500)` retry loop (lines 192-196) meant the mutation kept firing for the first ~5 seconds after load.
- **Confirmed re-enable dates:** `e2e/shop-flow.spec.ts:52` and `e2e/search-flow.spec.ts:45` both re-enabled 2026-05-09 after Coach's script was pulled from the WP footer ACF field. Search-flow spec notes "search pages don't trigger the same race" (search results are static links, not the same click-through-to-navigation shape as shop → PDP).
- **How the React provider avoids the same race:** Do NOT call `history.replaceState`; do NOT rewrite `href` attributes; do NOT do form injection; do NOT patch iframes; do NOT poll the DOM with `setInterval`. Read `window.location.search` once inside a mount-only `useEffect`, derive the attribution object, write sessionStorage first-touch, done. No DOM writes, no URL mutations, no repeated work. This aligns with GUARDRAIL 5 (React provider, not injected script) and G11's "environment drift" resolution (script's DOM-mutating side effects were the harm, capture-to-storage is not).

---

## GAPs needing staging test or access

- **G1. Staging URL for Phase 2 REST readback.** `dbp.dockbloxx.com` (per manager § 3)
  vs `dockbloxx.mystagingwebsite.com` (per .env.local.example). Ask Tony which is the
  Phase 2 surface.
- **G2. `source_type` accepted enum values.** WC's Order Attribution source is authoritative;
  general-knowledge answer is `utm | referral | organic | typein | admin | mobile_app`
  but this needs to be confirmed against WC source / docs / Coach before CONTRACT.md
  Row 6 is locked.
- **G3. gclid key: `gclid` vs `_cltk`.** Which was live in the WP footer script before
  the pull? Coach can settle this in one sentence. CONTRACT.md locks `gclid` for both
  columns 2 and 3 as the recommended canonical answer regardless, but the answer
  informs whether the reader's Line 34 `_cltk` was ever a match or has been broken
  since day one.
- **G4. Are any downstream consumers still reading `_coach_ghl_*` meta?** CLEANUP_BACKLOG
  says "Production has no consumer" but this predates any recent WP-plugin changes.
  Per GUARDRAIL 9, confirm with Tony before proposing removal in Phase 1.

## QUESTIONS for Tony / Coach

1. **Staging URL** (see G1). One-line answer required for Phase 2 planning.
2. **gclid convention** (see G3). Which script version was actually live in the WP
   footer pre-pull — the archived `attribution-script.md` version writing `gclid`, or
   a different version writing `_cltk`? Informs whether the reader's `_cltk` line ever
   worked.
3. **Coach-prefixed writes** (see G4). Any downstream (GHL webhook, WP plugin, report)
   still reading `_coach_ghl_*`? If not, Phase 1 can decommission them alongside the
   native re-point. If yes, retain both writes.
4. **`source_type` enum** (see G2). Confirm the accepted enum or point at the WC source
   file. If unspecified in scope-of-work with Coach, I'll default to `utm` when UTM params
   present, `referral` when referrer is external non-search/non-social, `organic` when
   referrer is a search engine, `typein` when no UTMs + no referrer — but need Coach
   sign-off before locking.
5. **Layout `<Script id="coach-attribution">` tag** (§ D). It's a no-op today (empty
   content injected). Safe to remove during Phase 1 — but per GUARDRAIL 9, awaiting
   your call.

---

## Where I stopped

- No files edited. No commits. No pushes. (Standing rule.)
- Task list #11-#18 completed; #19 (this file + CONTRACT.md) in progress.
- Both templates filled in this same phase (per T2 workflow: `RECON_FINDINGS.md` AND
  `CONTRACT.md` are Phase 0 deliverables, gated together).
- Response artifact mirror written to `agent_docs/RESPONSES/` per CLAUDE.md v3.1
  Response Logging Protocol.
- Awaiting your approval on BOTH templates before proceeding to `workflow/01_SOLUTION.md`.
