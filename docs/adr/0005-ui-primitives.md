# ADR-0005: Radix Dialog as the accessible overlay primitive, loaded on demand

- Status: Accepted (task T06, SPEC §17 P1 item 6)
- Date: 2026-10-27
- Deciders: orchestrator (brief decision 10 reserves this number); to be acknowledged by the owner
- Related: RULES §8.6, §9.2, §11; SPEC §9; ADR-0004 (JS budgets)

## Context

The menu drawer (T06), the filters drawer (T08) and the cart drawer (T10) are modal overlays. RULES §8.6 requires
a focus trap, `Esc` to close, focus returning to the trigger, an inert background, and says to use "a vetted
headless primitive rather than custom focus code". SPEC §9 suggests Radix UI. RULES §9.2 requires an ADR with
a measured justification for any client dependency over 10 kB gzip, and RULES §11 asks for purpose, size,
maintenance status, licence and why existing tools are not enough.

## Options considered

1. **Hand-rolled dialog.** Rejected by RULES §8.6.
2. **Native `<dialog>` with `showModal()`.** No JavaScript cost, and it gives the top layer, a focus trap, `Esc`
   and an inert page. It does not lock page scroll, has no exit animation without extra code (`@starting-style`
   and `allow-discrete` transitions are recent), returns focus inconsistently across browsers, has no portal or
   nested-layer story, and gives no shared API for the drawer, sheet and popover variants the later tasks need.
   We would end up writing the missing parts ourselves, which is the "custom focus code" RULES §8.6 warns about.
3. **`@radix-ui/react-dialog`.** Unstyled, accessible primitives; the same package serves all three drawers.
   Chosen.

## Decision

Add `@radix-ui/react-dialog` **1.3.1** (exact pin, `package.json` and lockfile). Use it only through
`Dialog.Root`, `Portal`, `Overlay`, `Content`, `Title` and `Close`.

| Item        | Value                                                                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose     | Focus trap, `Esc`, focus return, `aria-hidden` on the rest of the page, pointer blocking, scroll lock, exit animation via `Presence`                                                                                                                           |
| Licence     | MIT. The 20 transitive packages it adds (other `@radix-ui/*`, `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`, `use-sidecar`, `use-callback-ref`, `aria-hidden`, `get-nonce`, `tslib`) are MIT or 0BSD (`pnpm licenses list --prod`) |
| Maintenance | Radix Primitives (WorkOS), released continuously, React 19 supported (peer range includes `^19.0.0`)                                                                                                                                                           |
| Size        | About **13.0 kB gzip** for the six parts above (measured: tree-shaken, minified bundle of those exports with React external, gzip level 9). Over the 10 kB line of RULES §9.2, hence this ADR                                                                  |
| CSP         | Scroll lock injects a `<style>` element and focus guards use inline `style` attributes: both are covered by `style-src 'unsafe-inline'` (ADR-0002). No `eval`.                                                                                                 |

### Loading it: code-split, off the critical path

Measured on `/en` from `pnpm start` in Chromium, summing the gzip (level 9) of every script response
(React DOM, the Next runtime and Turbopack's runtime are "framework"; everything else is "application code",
as in ADR-0004):

| State                                                           | Total first-load JS | Application code |
| --------------------------------------------------------------- | ------------------- | ---------------- |
| After T03 (HEAD before T06)                                     | 154.4 kB            | 15.7 kB          |
| After T06, drawer **code-split** (shipped)                      | 158.3 kB            | 19.8 kB          |
| Estimate if the drawer were bundled with the page (not shipped) | about 172 kB        | about 34 kB      |
| Drawer chunk, fetched when the menu is first used               | 14.2 kB             | (on demand)      |

Putting Radix in the page would use 34 of the 40 kB application allowance of the Home route (ADR-0004) before the
hero, product grid and cart badge exist. So `MobileNav` (the trigger, 1 kB) renders the hamburger button and
`next/dynamic`-loads `MobileNavPanel` (Radix, the two switchers, the link lists) the first time the menu is
opened. The trigger starts the download on pointer enter, focus and touch start, so the click that opens the menu
does not wait for the network. The same pattern applies to the filters and cart drawers.

## Consequences

- Home first-load JS grows by 3.9 kB total (4.1 kB application) for the whole shell: header surface, hamburger,
  language and currency islands excluded from the drawer, footer newsletter form. Everything else waits for a click.
- The first open of the menu on a very slow connection can show a short delay; warming on hover/focus/touch makes
  that rare, and the panel stays mounted afterwards.
- The Radix surface is deliberately narrow: T08 and T10 use the same parts through the same wrapper pattern, so a
  later switch to another primitive touches one file per drawer.
- Radix does not set `aria-modal`; the panel sets `aria-modal="true"` itself and opts out of a description
  (`aria-describedby={undefined}`) because the title and the links say everything.
