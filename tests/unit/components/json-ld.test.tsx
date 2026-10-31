import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbJsonLd, organizationJsonLd } from '@/lib/structured-data';

describe('JsonLd (FR-036)', () => {
  it('renders one ld+json script whose body parses back to the data', () => {
    const data = organizationJsonLd('en', 'Quiet essentials');
    const html = renderToStaticMarkup(<JsonLd data={data} />);
    const body = />(.*)<\/script>$/s.exec(html)?.[1] ?? '';

    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(JSON.parse(body)).toEqual(data);
  });

  it('cannot be broken out of by a </script> string in the data', () => {
    const data = organizationJsonLd('en', '</script><script>alert(1)</script>');
    const html = renderToStaticMarkup(<JsonLd data={data} />);
    const body = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));

    expect(body).not.toContain('</script>');
    expect(body).not.toContain('<');
    expect(JSON.parse(body)).toEqual(data);
  });

  it('accepts a list of documents', () => {
    const data = [organizationJsonLd('th'), breadcrumbJsonLd([{ name: 'Home', path: '/th' }])];
    const html = renderToStaticMarkup(<JsonLd data={data} />);
    const body = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));

    expect(JSON.parse(body)).toHaveLength(2);
  });
});
