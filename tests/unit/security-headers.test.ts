import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, buildSecurityHeaders } from '@/lib/security-headers';

describe('buildContentSecurityPolicy', () => {
  it('never allows unsafe-eval in production (RULES 10.4)', () => {
    expect(buildContentSecurityPolicy({ isDev: false })).not.toContain('unsafe-eval');
  });

  it('allows unsafe-eval only in development', () => {
    expect(buildContentSecurityPolicy({ isDev: true })).toContain("'unsafe-eval'");
  });

  it('locks down framing, plugins, base URI and form targets', () => {
    const csp = buildContentSecurityPolicy({ isDev: false });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('upgrades insecure requests in production only', () => {
    expect(buildContentSecurityPolicy({ isDev: false })).toContain('upgrade-insecure-requests');
    expect(buildContentSecurityPolicy({ isDev: true })).not.toContain('upgrade-insecure-requests');
  });
});

describe('buildSecurityHeaders', () => {
  it('includes the non-CSP hardening headers', () => {
    const headers = new Map(buildSecurityHeaders({ isDev: false }).map((h) => [h.key, h.value]));
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });
});
