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
