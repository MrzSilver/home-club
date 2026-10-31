# P3 validation

## P3 Preview run - 2026-10-31

Measured against the Vercel Preview of commit `a3a65a2` (branch `feat/p3-seo-builders`, PR #8):
`https://home-club-git-feat-p3-seo-builders-silversvs-projects.vercel.app`.
`lighthouserc.cjs` was not changed. Command: `LHCI_TARGET=preview LHCI_BASE_URL=<preview> pnpm lhci`
(Lighthouse 12.6.1, mobile, 5 runs per URL, median aggregation, 8 URLs, 40 runs, from the owner
workstation, not the GitHub workflow). The preflight (`node scripts/check-preview-headers.mjs`) confirmed
all 8 URLs return 200 with `X-Robots-Tag: noindex`.

Machine-readable summary: [p3-deployed-audit.json](./p3-deployed-audit.json). Full reports (40 LHR JSON/HTML
files) are in the git-ignored `.asset-sources/p3-preview-a3a65a2/`, as in P1/P2.

The case-study route does not exist at this commit, so it was not measured.

### Assertions

All error-level assertions passed (performance, accessibility, best-practices, LCP, TBT, CLS, and the
Preview SEO audits `document-title`, `meta-description`, `http-status-code`, `link-text`,
`crawlable-anchors`, `image-alt`, `hreflang`, `canonical`). One warning per URL (8 total):
`categories.seo` expected >= 0.95, found 0.69 on every run of every URL. The only failing SEO audit in every
run's report is `is-crawlable` (Preview is intentionally noindex; ADR-0004 amendment), which the Preview
config sets to `off`.

### Results (medians)

| Route                          | Perf | A11y |  BP |  SEO |  LCP ms | TBT ms |     CLS |
| ------------------------------ | ---: | ---: | --: | ---: | ------: | -----: | ------: |
| `/en`                          | 0.97 |    1 |   1 | 0.69 | 2434.45 |     86 |       0 |
| `/th`                          | 0.95 |    1 |   1 | 0.69 | 2431.77 |     97 |       0 |
| `/en/shop`                     | 0.98 |    1 |   1 | 0.69 | 2234.54 |    117 |       0 |
| `/th/collections/foundations`  | 0.97 |    1 |   1 | 0.69 | 2443.36 |     97 | 0.00028 |
| `/en/products/essential-tee`   | 0.99 |    1 |   1 | 0.69 | 2022.33 |     64 |       0 |
| `/th/products/essential-tee`   | 0.96 |    1 |   1 | 0.69 | 2462.49 |    102 |       0 |
| `/en/looks/the-essential-look` | 0.97 |    1 |   1 | 0.69 | 2291.61 |    111 |       0 |
| `/th/looks/the-essential-look` | 0.97 |    1 |   1 | 0.69 | 2433.68 |    100 |       0 |

### Comparison with the P2 deployed run

P2 numbers are in `docs/p2-deployed-audit.json` on branch `origin/codex/p2-look-builder` (commit `dc3cb22`,
not yet merged into this branch), measured on `878fcb0`. Performance / LCP ms / TBT ms, P2 then P3:

| Route                          | Perf       | LCP ms           | TBT ms  |
| ------------------------------ | ---------- | ---------------- | ------- |
| `/en`                          | 0.97, 0.97 | 2438.98, 2434.45 | 63, 86  |
| `/th`                          | 0.97, 0.95 | 2293.87, 2431.77 | 65, 97  |
| `/en/shop`                     | 0.97, 0.98 | 2286.91, 2234.54 | 73, 117 |
| `/th/collections/foundations`  | 0.97, 0.97 | 2435.37, 2443.36 | 87, 97  |
| `/en/products/essential-tee`   | 0.98, 0.99 | 2287.89, 2022.33 | 62, 64  |
| `/th/products/essential-tee`   | 0.99, 0.96 | 1994.33, 2462.49 | 50, 102 |
| `/en/looks/the-essential-look` | 0.97, 0.97 | 2429.47, 2291.61 | 52, 111 |
| `/th/looks/the-essential-look` | 0.96, 0.97 | 2438.21, 2433.68 | 56, 100 |

TBT is higher on all 8 routes and LCP is higher on 3 of 8 routes; all remain inside
the budgets (LCP < 2500, TBT < 200). `/th` performance dropped to 0.95, the minimum allowed, and
`/th/products/essential-tee` LCP is 2462.49 ms, 37.5 ms under the limit; there is little headroom on these two.
Single runs on a workstation vary (the P2 file shows runs from 1982 to 2582 ms for identical builds), so these
differences are not attributed to a specific change.

### Canonical and hreflang on Preview

`NEXT_PUBLIC_SITE_URL` is unset on this Preview, so the HTML emits `rel="canonical"` and `hreflang`
alternates pointing at `http://localhost:3000/...` (verified with `curl` on `/en`: canonical
`http://localhost:3000/en`, alternates `en`, `th`, `x-default` on `localhost:3000`). Lighthouse nevertheless
scored the `canonical` and `hreflang` audits 1 (pass) on all 40 runs: both audits check that the tags are
well-formed and absolute, not that the host matches the page. Neither produced a warning or error, so there is
no blocked run. The localhost host is a Preview configuration gap that Lighthouse does not detect; it must be
checked on Production (or with `NEXT_PUBLIC_SITE_URL` set on Preview), since these audits would not catch it.

### Note on the lhci upload step

`LHCI_TARGET=preview` is also read by `lhci` as its `--target` (upload) option, so the final `upload` step
failed with `Invalid values: Argument: target, Given: "preview"` and the autorun printed
`WARNING: upload command failed.` The collect and assert steps completed first, the process exited 0, and
reports were written to `.lighthouseci/` as configured. The same variable is used by
`.github/workflows/lighthouse-preview.yml`, so the same message is expected there.
