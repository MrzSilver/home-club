// Supported locales. A module of its own, free of Zod, because client code (the i18n navigation
// helpers) needs the list and Zod must stay out of the browser bundle: it probes `Function("")` at
// load time, which our CSP (no unsafe-eval) reports as a violation. The Zod schema is in ./schema.
export const LOCALES = ['en', 'th'] as const;
