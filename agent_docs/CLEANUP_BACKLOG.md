# Cleanup Backlog — Dockbloxx

Non-urgent items tracked for future cleanup sessions. Not bugs, not security issues — technical debt with known fix paths.

## Open Items

### Dead `priceAfterDiscount` calc in `orderTransform.ts`

- Lines from original route.ts (now in orderTransform lib)
- Computes `priceAfterDiscount`, only consumed by a `console.log`
- Fix: remove computation; remove `console.log`
- Risk: very low

### Next.js 15 `params` async warning

- `src/app/(public)/dealer-coupon/[dealerSlug]/page.tsx` and other `[param]/page.tsx` files
- Current: sync access pattern (`const x = params.x`)
- Fix: await params before destructuring (`const { x } = await params`)
- Warning today, error in future Next.js version

### Lint warnings (165 deferred)

- `no-unused-vars` (73), `no-explicit-any` (41), `no-img-element` (34), `exhaustive-deps` (17)
- Currently downgraded to `warn` in `.eslintrc.json`
- Plan a focused cleanup sprint post-high-season

### ApplyCoupon "Dealer Coupon Detected" banner dead code

- `src/components/checkout/right-pane/ApplyCoupon.tsx`
- sessionStorage-driven banner that no longer fires (Coach's attribution script removed)
- Harmless (inert) but redundant

### Stripe metadata string coercion

- `src/app/api/create-payment-intent/route.ts`
- `metadata: { orderId }` may pass numbers; Stripe prefers strings
- Fix: `metadata: { orderId: String(orderId || "N/A") }`

### Stripe input validation

- Tracked in `SECURITY_FINDINGS.md` Finding #2
- Not in this backlog because it's a security item, not pure cleanup

### Attribution types belong in `/types`

- `WcSourceType`, `CapturedAttribution`, `ReferrerClassification` currently live in
  `src/lib/attributionCapture.ts`; `AttributionData` lives in `src/lib/attribution.ts`.
- Tony's convention: all interfaces/types go in `/types`.
- Deferred during T2 Phase 1 to keep scope surgical (would relocate the pre-existing
  `AttributionData` too). Fix: move all four to `src/types/attribution.ts`, update imports.
- Risk: low (pure type move).

### Legacy attribution tracker still active (retire — candidate ticket)

- Discovered during T2 Phase 2 manual testing (2026-07-29).
- A legacy tracker still runs on the page and writes a PARALLEL attribution key set to
  **localStorage** (observed stale `utm_content="carou"`, full google/cpc set) plus `_cltk`
  to sessionStorage. This is NOT the T2 `AttributionProvider` (which is sessionStorage-only,
  code-verified) and NOT the reader's concern (reader reads its own contract keys).
- Risk: confusion / competing attribution signals; stale values.
- Action: identify the source (WP footer? GTM tag? another injected script?) and retire it.
  **Do NOT remove within Ticket 2** (out of scope, GUARDRAIL 9/10). Its own follow-up ticket.
- Addendum (T2 Phase 2, 2026-07-29): `_cltk` re-written on EVERY landing incl. post-Clear-site-data
  (live, not residue). Also observed (Finding 3): script-driven navigation to a Google
  `warmup.html` seconds after landing in incognito (not in clean profile) — suspected same
  tracker / GTM-adjacent; fold into this ticket's investigation.

### GHL attribution feature plumbing

- Feature deprecated; plumbing left intact in code
- Components still present:
  - `src/app/api/place-order/route.ts` (meta_data writing via lib)
  - `src/lib/attribution.ts` (likely)
  - `src/lib/orderTransform.ts` (attribution block)
  - Frontend sessionStorage reads
- Production has no consumer (no Cyberize plugin, no GHL webhook)
- Code writes empty meta to Woo orders on prod — harmless
- Intentionally NOT tested in this session — feature is dead, test value ≈ feature value
- May be removed in a future cleanup session, but no urgency
