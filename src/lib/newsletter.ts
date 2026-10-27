// Pure validation for the demo newsletter form. It deliberately does not use Zod: this runs in the
// browser, and Zod must stay out of client bundles (+35 kB, and its load-time Function("") probe
// trips the CSP). tests/unit/lib/newsletter.test.ts checks it against Zod's own email schema so the
// two cannot drift apart.

export type NewsletterEmailResult =
  { ok: true; email: string } | { ok: false; reason: 'required' | 'invalid' };

// Copy of the pattern behind Zod 4's `z.email()` (zod/v4/core/regexes.js), so both accept the same
// addresses. The unit test compares them on a corpus.
export const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export function parseNewsletterEmail(input: string): NewsletterEmailResult {
  const email = input.trim();
  if (email === '') return { ok: false, reason: 'required' };
  return EMAIL_PATTERN.test(email) ? { ok: true, email } : { ok: false, reason: 'invalid' };
}
