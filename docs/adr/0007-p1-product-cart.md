# ADR-0007 — Product and persisted cart (P1 T09–T10)

## Context

FR-030–033 and FR-050–051 require the already planned product and cart routes, a stock-safe cart and resilient persistence. Search and checkout remain P2. Global client code must not import the seed catalogue or its full Zod schemas.

## Decision

Use the SPEC-prescribed Zustand 5.0.8 (MIT) with persist middleware. Its small React/vanilla store replaces hand-built subscription and persistence code; no existing dependency provides this. It is below the 10 kB gzip client-dependency threshold. Use Zod's existing mini entry point for non-JIT, strict cart rehydration under CSP. Persist SKU/quantity only, version 1 under hc:cart:v1. Reject unknown persisted fields and unsupported look IDs in P1; recompute stock limits and totals from current server-provided catalogue data. Browser storage failures fall back to in-memory operation.

A per-tree cart provider receives a compact catalogue projection from the server and exposes hydration-safe state. The header badge stays absent in server HTML. Radix drawer content loads on interaction; focus returns to the initiating control. Product and cart routes use the existing hidden currency segment and static locale/currency combinations. No new backend, PII or checkout is introduced.

## Consequences

The compact server catalogue is serialized for cart rendering, without importing seed modules or full schemas into global client JavaScript. Changes in persisted schema require versioning; P2 look grouping will need an explicit migration. Browser and Lighthouse tests measure the resulting loading cost.

Product cards disable viewport route prefetch: revealing cards during filtering or scrolling to the Home newsletter must not fetch unrelated product RSC payloads. Product links remain standard locale-aware links.

The Zod mini persistence validator is imported only when storage contains a cart. Empty first visits load the small typed stock reconciler, not a validator they do not use; a stored cart is never exposed until asynchronous validation completes.

Home navigation links also disable viewport prefetch: the measured speculative Collection requests downloaded and executed extra client code during Home loading. T11 measures actual script responses in fresh Chromium contexts (including automatically imported scripts), not just SSR script tags; the CI gate runs after browser installation.
