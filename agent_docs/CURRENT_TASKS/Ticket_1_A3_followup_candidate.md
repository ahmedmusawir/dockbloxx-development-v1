# Ticket 1 A3 — Follow-up Ticket Candidate

`user_signup` / `regCustomer` remount re-fire bug on the thank-you page.

**Status:** Report only. Not implemented. Discovered during Ticket 1 Track A execution
(2026-07-02). Tony's decision (2026-07-02, 11:40): log as candidate for a **new** follow-up
ticket; do not implement in Ticket 1 scope. Location signals intent — this file lives ONE
LEVEL UP from `Ticket_1_Solution_Pack/` for that reason.

**Severity:** Low (see § Severity below).

**Effort:** Trivial — ~5-line change in the same file A1/A2 touched, mirroring A1's pattern.

---

## Finding — Evidence

`src/app/(public)/thankyou/ThankyouPageContent.tsx` contains a second
remount-safe-only-in-appearance guard, structurally identical to the `hasTrackedPurchase`
guard fixed in Ticket 1 Track A A1:

- **Line 16 (pre-fix state):** `const isCustomerRegistered = useRef(false);`
- **Lines 47-73** (inside the same `useEffect(() => {…}, [])` block that A1/A2 modified):
  guarded by `if (!isCustomerRegistered.current && enableRegistration && checkoutData.billing.email)`,
  the code sets `isCustomerRegistered.current = true` then calls `regCustomer({…})` — a
  POST to `/api/register-customer` that creates a WordPress user — and on success calls
  `trackSignup({…})` which pushes a `user_signup` event to `window.dataLayer`.

This is **Evidence E10** in `Ticket_1_Solution_Pack/EVIDENCE_ADDENDUM.md`:

> The same remount bug re-runs customer registration (`user_signup` fired alongside
> purchase on the thank-you page). Same root pattern.

E10 is labeled `EVIDENCE, code + live` — this was confirmed to fire in live testing, not
merely theorised.

## Mechanism (identical to Ticket 1 A1)

1. `useRef(false)` is component-scoped React state. Component unmounts → ref is
   discarded. Component remounts → `useRef(false)` reinitialises to `false`.
2. Hard refresh, back-navigation, or any full remount of `ThankyouPageContent` resets
   the ref.
3. The effect runs again on the fresh mount. If the trigger conditions still hold,
   `regCustomer` fires again — followed by `trackSignup` on success.

**Effective trigger surface — preconditions to hold across remount:**

- `enableRegistration` from `useCheckoutStore` remains `true`
- `checkoutData.billing.email` from `useCheckoutStore` remains populated

Whether these preconditions survive a hard refresh depends on whether
`useCheckoutStore` persists to storage (Zustand `persist` middleware) or is in-memory
only. Not verified in this report; a quick grep of `src/store/useCheckoutStore.ts` for
`persist(` will settle it. Back-navigation (soft) triggers the bug regardless of store
persistence, since a back-nav doesn't necessarily clear in-memory Zustand state.

Note: after Ticket 1 A2, `localStorage.removeItem("latestOrder")` short-circuits the
entire outer `if (storedOrder)` block on any subsequent mount — which means the
signup re-fire path is ALREADY effectively closed on same-tab refresh (no
`storedOrder` → no `parsed` → no downstream signup code reachable). A2's clear is doing
partial double duty. The fix here is defense-in-depth for the day someone adds a code
path that re-enters the effect independently of `storedOrder`, and for the back-nav
edge case where `storedOrder` may still be present transiently.

## Impact (practical, if it fires)

1. **`regCustomer` POST → WordPress user creation.** On duplicate email, WordPress rejects
   the request. Client logs `console.error("Customer registration failed")`. Console
   noise, no data corruption at the WP layer (email uniqueness protects the DB).
2. **`trackSignup(…)` → `dataLayer.push({event: "user_signup", …})`.** GA4 receives a
   duplicate `user_signup` event. Signup metrics inflate by one per bug-affected
   thank-you visit.

**Blast radius:**

- **No revenue impact** (unlike Ticket 1 A1, whose `purchase` event fanned out to Google
  Ads, Meta Ads, and TikTok via the `ee - purchase` trigger — see Ticket 1 E9).
- **GA4 `user_signup` count only.** No other ad-platform tags fire on `user_signup` per
  current GTM inventory (verify against GTM-KVFXFKQ8 if attempting fix).
- **WP write layer is idempotent-by-uniqueness** on the `email` column of `wp_users` — no
  duplicate accounts get created regardless.

## Severity classification

**Low.**

- Not money. Not revenue. Not attribution.
- WP-side is protected by unique-email constraint.
- Blast radius bounded to a single GA4 event's count.
- Console noise, not silent corruption.

Compare to Ticket 1 A1 which was:

- **Money.** Inflated revenue in GA4.
- **Four-platform blast radius** (GA4 + Google Ads + Meta + TikTok).
- Coach's escalation prompted the ticket.

## Proposed fix (mirror Ticket 1 A1 pattern)

**File:** `src/app/(public)/thankyou/ThankyouPageContent.tsx`

**Shape:** Replace `isCustomerRegistered` `useRef` with a persistent, uniquely-keyed
marker. Two viable key options:

- **Option 1 — Order-keyed** (recommended): `signup_fired_${parsed.id}` in
  `sessionStorage`, mirroring A1's `ga4_purchase_fired_${parsed.id}` shape exactly. Same
  lifecycle (per-tab, survives refresh + back-nav within the tab, per-order granularity
  so a legitimate second order in the same session can register a different customer if
  that path ever exists).
- **Option 2 — Email-keyed:** `signup_fired_${checkoutData.billing.email}` in
  `localStorage`, so re-registration is blocked across tabs AND across future sessions
  until the user clears storage. Better cross-boundary protection but stickier — makes
  legitimate re-registration of the same email impossible even if the user's WP account
  was later deleted. More opinionated.

**Recommendation: Option 1.** Consistency with A1, per-tab isolation, symmetric semantics
("this order's signup has been fired"). Confirm no legitimate path exists where a single
order should fire `user_signup` twice; if there is one, revisit.

**Whichever option is chosen:**

- Remove the `isCustomerRegistered` ref (storage is the single source of truth).
- Preserve the existing trigger conditions (`enableRegistration && checkoutData.billing.email`).
- Add a comment mirroring A1's ("sessionStorage marker keyed by … — survives refresh +
  back-nav; GUARDRAIL 7 mirror").
- Update `useRef` import removal accounting: after this fix, if no other `useRef` remains,
  drop it from the imports.

## Test approach (mirror Ticket 1 Phase 2 shape)

Same test scaffold as Ticket 1's Testing 1B/1C/1D:

- Place a test order that triggers `enableRegistration = true` → confirm exactly one
  `user_signup` event fires + WP user is created.
- Refresh `/thankyou` → confirm no second `user_signup` (both A2's short-circuit and the
  new marker cooperate).
- Back-nav to `/thankyou` → confirm no second `user_signup`.
- New tab with `/thankyou` URL → confirm no second `user_signup` (A2's `latestOrder`
  clear should already short-circuit; new-tab marker absent, so verifies the new lock
  independently would also block if the outer conditions changed).
- Place a second order with a different email in the same session → confirm the
  second signup fires cleanly (per-order/per-email lock).

## Related evidence

- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/EVIDENCE_ADDENDUM.md` — E10 (this
  finding), E3/E4 (parent mechanism this mirrors)
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/GUARDRAILS.md` v1.1 — Rule 11
  (adjacent findings report-only)
- `agent_docs/CURRENT_TASKS/Ticket_1_Solution_Pack/workflow/01_SOLUTION.md` v1.1 —
  Step A3 (report-only mandate)
- Ticket 1 Track A A1 diff applied 2026-07-02 to
  `src/app/(public)/thankyou/ThankyouPageContent.tsx` — the pattern this fix mirrors
- `RECON_FINDINGS.md` § D — the ref-guard mechanism analysis

## Suggested ClickUp fields

- **Title:** "Thank-you page re-registers customer + refires user_signup on refresh
  (same-pattern bug as Ticket 1 A1)"
- **Type:** Bug / Follow-up
- **Priority:** Low
- **Parent / relationship:** Ticket 1 (GA4 `purchase` double-fire)
- **Estimated effort:** < 30 min
- **Files touched:** `src/app/(public)/thankyou/ThankyouPageContent.tsx` (1 file, ~5
  lines)
