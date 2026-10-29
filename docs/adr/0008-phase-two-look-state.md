# ADR 0008 — Phase 2 look selections and cart grouping

Status: accepted for implementation by the owner's Phase 2 request (2026-10-29).

The owner authorized starting Phase 2 while Phase 1's deployed Lighthouse confirmation remains
open in PR #6. This does not waive release budgets or declare Phase 1 passed.

Look index/detail routes follow the existing static locale/currency architecture. A route-local,
dynamically imported builder receives only allowed catalogue products from the server. Selection
is transient React state; optional shareable URLs (FR-044, P3) are deferred. No new dependency.

The existing optional `CartLine.lookId` field becomes active. Version 1 storage accepts that
optional field and remains compatible with old SKU/quantity carts. No prices are persisted.
Line identity is SKU plus optional look ID. Different groups share stock, atomic additions reject
the entire batch on insufficient stock, and only complete four-slot allowed sets earn discounts.
Repeated sets merge by SKU/group; units are paired deterministically across allowed products
in each slot. Only the minimum complete set quantity earns the set discount.
Changing/removing a member immediately recomputes eligibility from current catalogue data.

Verification includes pure selection/pricing/atomicity tests and EN/TH mobile/desktop browser
journeys covering invalid slots, alternatives, grouped discounts, reload and removal.
