# references/ORIENTATION.md — System Mental Model

### The model
**Pole Material is a passenger, not a driver.** It rides the same seat Pole Style rides:
ACF options → category JSON → radio → `cartItem.variations` → order meta. It never
touches the WooCommerce variation matrix, never touches price, never resolves
`variation_id`. Drivers (Pole Shape, Pole Size, Version) decide price; passengers
(Pole Style, Pole Material) decide what the order says.

### Why the work falls where it does
Everything centralized and non-pricing already lives in the ACF "Product Global"
options page and is read once on the server, embedded as JSON, and consumed by client
components. That is why this ticket is four small frontend touches (reader, JSON,
component, cart write) plus a manual ACF entry by the Director — and zero WooCommerce
product edits, zero PHP.

### What already exists (verify in recon)
H1–H8 in CLAUDE.md §3. The precedent component is `BloxxPricingPoleStyles.tsx`; the
precedent cart write is `handleSizeSelection` (filter-then-append); the precedent order
shape is staging order #14889's nested `variations` meta block.

### The named trap for this ticket
**Wholesale rebuilds of `cartItem.variations`.** `BloxxPricing.tsx` reassigns the entire
array in several `useEffect`s (init, shape change) and in `handleShapeSelection`. Any
site that rebuilds without re-seeding Pole Material silently drops it, and the order
would show nothing — not `Unknown`, nothing. Recon section D enumerates every site; the
CONTRACT carries `Unknown` as the mandatory seed; the Acceptance Spec's regression AC
(select Wood → change shape → Wood still on the cart item) defends it. Second trap:
`handlePoleStyleChange` looks like the pattern to copy and is state-only — it is the
anti-pattern (GUARDRAILS 12/13).

### Definition of Done, restated in one breath
A shopper on any Bloxx product page sees Metal / Wood under Pole Shape Styles, picks one
(or not), buys, and the staging WooCommerce order line shows `Pole Material: Wood`
(or `Unknown`) in the same nested block as Pole Style, readable identically over REST,
with price and variation matching untouched — and QA's Acceptance Report says so.
