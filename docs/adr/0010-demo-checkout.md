# ADR 0010 — Ephemeral demo checkout

Status: accepted for the owner-authorized P2 checkout (FR-053–055).

Use controlled submission of a native React form with a strict Zod mini schema rather than
adding a form library and resolver for this small, single-step demo. This keeps validation in
pure `lib/checkout.ts`, supports field-linked errors and a focused error summary, and adds no
dependency to the global shell. SPEC's form-stack row is updated to match this decision.

No action or server endpoint receives the form. The handler prevents native submission, checks
current cart totals from catalogue projections, validates required example contact/address
fields, resets the form DOM and clears the cart. It navigates with only a generated
`HC-DEMO-<UUID>` reference. The success page clearly says no payment was taken; a direct visit
without a reference says none was supplied. References are not real orders and are not stored.

Both shipping choices are explicitly simulated and free. No card fields, account, external API,
email, analytics, PII persistence or backend is introduced. The permanent demo notice asks visitors
to use example data. Browser tests assert no POST and no email in local/session storage.

Size-guide values are explicitly illustrative body measurements, not dimensions or fit claims
about the photographed garments. This avoids inventing real product measurements.
