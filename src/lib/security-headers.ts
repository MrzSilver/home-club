export type SecurityHeader = { key: string; value: string };

type SecurityHeaderOptions = {
  /** Development servers need `unsafe-eval` (React debugging) and a HMR websocket. */
  isDev: boolean;
};

/**
 * Content-Security-Policy for the whole site.
 *
 * script-src keeps 'unsafe-inline' so every page can stay statically generated (Next.js injects
 * inline bootstrap scripts, and a per-request nonce would force dynamic rendering). This is the
 * accepted option B in docs/adr/0002-csp.md. 'unsafe-eval' is never allowed in production
 * (RULES 10.4).
 */
export function buildContentSecurityPolicy({ isDev }: SecurityHeaderOptions): string {
  const directives: string[][] = [
    ['default-src', "'self'"],
    ['script-src', "'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['img-src', "'self'", 'data:', 'blob:'],
    ['font-src', "'self'"],
    ...(isDev ? [['connect-src', "'self'", 'ws:', 'wss:']] : []),
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['frame-ancestors', "'none'"],
    ...(isDev ? [] : [['upgrade-insecure-requests']]),
  ];
  return directives.map((parts) => parts.join(' ')).join('; ');
}

export function buildSecurityHeaders(options: SecurityHeaderOptions): SecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options) },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}
