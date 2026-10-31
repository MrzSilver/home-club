# ADR 0009 — Compile local Journal MDX

Status: accepted for the owner-authorized Phase 2 Journal (FR-061).

Use the integration documented in the installed Next.js MDX guide: `@next/mdx` 16.4.3,
`@mdx-js/loader` 3.1.1, `@mdx-js/react` 3.1.1 and `@types/mdx` 2.0.14, pinned in the lockfile.
These are MIT-licensed. They compile local repository content into Server Components; no remote
MDX, runtime compilation, client provider or eval is added. The server-only article registry
validates exported metadata with Zod. Reading time uses word segmentation of the actual source.

This follows Next's maintained integration instead of a custom Markdown parser. Journal routes
use the same static locale/currency segments. Six original demo articles cover three topics in
EN/TH. No product specification or care claims are inferred from photographs.

The JavaScript budget check verifies shared catalogue routes after adding the integration; MDX
compilation dependencies must remain off the client path. No existing budget changes.
