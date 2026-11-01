import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LocaleError from '@/app/[locale]/error';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { resetNavigationMock } from '../helpers/navigation-mock';

vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);

const CATALOGUES = { en, th } as const;

const error = Object.assign(new Error('secret stack detail'), { digest: 'abc123' });

function renderBoundary(locale: 'en' | 'th', reset = vi.fn()): ReturnType<typeof vi.fn> {
  resetNavigationMock('/', locale);
  render(
    <NextIntlClientProvider locale={locale} messages={{ errorPage: CATALOGUES[locale].errorPage }}>
      <LocaleError error={error} reset={reset} />
    </NextIntlClientProvider>,
  );
  return reset;
}

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

describe.each(['en', 'th'] as const)('route error boundary in %s (SPEC 13a, PRD 8)', (locale) => {
  const copy = CATALOGUES[locale].errorPage;

  it('shows one focused h1 and never leaks the message or digest', async () => {
    renderBoundary(locale);
    const h1 = await screen.findByRole('heading', { level: 1, name: copy.title });
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(h1).toHaveFocus();
    expect(document.body).not.toHaveTextContent('secret stack detail');
    expect(document.body).not.toHaveTextContent('abc123');
  });

  it('calls reset when Try again is pressed', async () => {
    const reset = renderBoundary(locale);
    fireEvent.click(await screen.findByRole('button', { name: copy.retry }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('offers a link to the home page and logs the error once', async () => {
    renderBoundary(locale);
    expect(await screen.findByRole('link', { name: copy.backHome })).toHaveAttribute(
      'href',
      `/${locale}`,
    );
    expect(logged).toHaveBeenCalledWith(error);
  });
});
