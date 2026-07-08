# references/ORIENTATION.md — System Mental Model (Ticket 2)

Read this to hold the system correctly and keep Ticket 2 from blurring into Ticket 1.

## Two separate pipes

**Pipe 1 — GA4 (Ticket 1, DONE — not this ticket).** App → dataLayer → GTM → GA4.
Analytics events. Do not touch it here.

**Pipe 2 — WooCommerce attribution (THIS ticket).** On landing, capture where the visitor
came from; hold it first-touch for the visit; write it onto the WooCommerce ORDER at
checkout; read it back via the REST API. This pipe never touches GA4.

One line to remember: **this ticket records where the buyer came from, onto the order.
It does not send anything to analytics.**

## Why the work falls on the app

WooCommerce ships an Order Attribution script that normally captures this automatically.
In a headless setup that script never runs (the storefront is Next.js, not
WP-rendered). So the app must do the capture-and-forward itself. The REST API does NOT
capture attribution — it only stores and serves what the frontend writes to the order.

## What already exists (verify in recon)

The GHL-era work left plumbing behind:
- A reader (`getAttribution`/`cleanAttribution`) that grabs attribution at checkout —
  likely still in the code, currently reading EMPTY because capture is gone.
- A consumer (StripePaymentForm) that attaches attribution to the order payload.
- A forward path that writes order meta — but under coach-prefixed (`_coach_ghl_*`) keys
  built for GoHighLevel, not the native WooCommerce keys this ticket wants.
- Coach's capture script — PULLED from the WP footer because it raced the E2E tests.

So the shape of the work is: bring capture back the safe way (React provider), make the
keys line up (the CONTRACT), and repoint the order-write to native Woo attribution meta.

## The silent-failure trap (why CONTRACT.md exists)

If the capture step writes a value under one key name and the reader looks under a
different key name, attribution comes back EMPTY with no error. Everything looks fine
until you inspect an order and find blank fields. The old contract doc and the live
reader disagreed (dbx_ prefixes vs un-prefixed; gclid via `_cltk`). CONTRACT.md is the
single locked map that every layer must agree on — capture, storage, reader, Woo meta,
REST field. Fill it in recon; validate it in testing.

## Definition of Done, restated

Done = attribution captured on landing, persisted first-touch, written to the order as
native meta, and READ BACK via the WooCommerce REST API. The WP admin Orders-screen
display is OUT OF SCOPE (operator decision — a known WP wall, not worth the time).
