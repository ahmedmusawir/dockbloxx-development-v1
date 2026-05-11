# Security Findings — Dockbloxx

Findings surfaced during integration test development. This document is the authoritative tracker for security issues discovered outside the test/fix cycle.

## Status Key

- 🔴 OPEN — confirmed issue, not yet addressed
- 🟡 IN PROGRESS — fix planned or in flight
- ✅ FIXED — addressed and verified

---

## Finding #1 — Error message leak in /api/create-payment-intent

**Status:** ✅ FIXED 2026-05-11 (Block 4 Step 4C.PRE)
**Severity:** HIGH (PII / financial data exposure)

### Problem

The route's catch block returned the raw Stripe error message to the client via `{ message: error.message }`. Stripe error messages can contain card details, customer emails, internal request IDs, and infrastructure hints.

### Discovery

Surfaced during Block 4 source recon (Step 4C.1) while planning integration tests.

### Fix

Catch block updated to log full error server-side, return generic message ("Failed to process payment. Please try again.") to client. Locked in by integration Test 4 which asserts no Stripe internals leak in 500 responses.

---

## Finding #2 — No input validation in /api/create-payment-intent

**Status:** 🔴 OPEN — recommended for next security/cleanup pass
**Severity:** MEDIUM (enables card-testing fraud + weird Stripe errors)

### Problem

The route accepts `amount`, `currency`, `email`, `name`, `phone`, `orderId`, `wooCustomerId` without any validation:

- No check that amount is a positive integer
- No minimum amount (enables $0.01 card-testing fraud)
- No currency whitelist
- No email format validation (passed to Stripe and used for customer lookup)
- No phone format validation

### Risk

An attacker can POST malformed/malicious payloads to either trigger Stripe errors (now patched by Finding #1) or perform card-testing attacks (running stolen credit card numbers against the endpoint at minimum amounts to verify validity before larger fraud).

### Recommended Fix

Add a zod schema or manual validation at the top of POST:

- `amount`: integer, >= 50 (50 cents minimum, Stripe's actual minimum is 50 cents for most currencies)
- `currency`: string, in known whitelist `['usd']`
- `email`: optional, valid email format if provided
- `phone`: optional, sanitize/validate if provided
- Reject with 400 + generic message on validation failure

### Mitigation Until Fix

- Stripe-side rate limiting (Stripe enforces some)
- Monitor Stripe dashboard for unusual payment intent patterns
- Consider WAF rules at Vercel layer

### Files

- `src/app/api/create-payment-intent/route.ts` (POST handler, top of function)

---

## Finding #3 — Error message leak in /api/place-order

**Status:** ✅ FIXED 2026-05-11 (Block 4 Step 4D.PRE)
**Severity:** HIGH (PII / WooCommerce internal data exposure)

### Problem

The route's Woo-failure branch returned the parsed WooCommerce error response to the client via `{ error: "...", details: errorData }`. WooCommerce error messages can contain customer emails, internal database column names, request IDs, and infrastructure hints.

### Discovery

Surfaced during Block 4 Step 4D source recon while extracting shadow-implementation logic to a shared lib.

### Fix

Removed `details` field from error response. Server still logs full error via `console.error` for debugging. Client gets generic "Failed to create order. Please try again." message. Locked in by integration Test 9 (`POST returns Woo status with generic message when Woo fails`) which asserts no Woo internals leak.
