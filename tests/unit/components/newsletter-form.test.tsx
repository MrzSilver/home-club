import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NewsletterCopy } from '@/components/layout/newsletter-fields';
import { NewsletterFields } from '@/components/layout/newsletter-fields';
import { NewsletterForm, type NewsletterHandoff } from '@/components/layout/newsletter-form';

const COPY: NewsletterCopy = {
  title: 'Join the Club',
  description: 'Demo only.',
  emailLabel: 'Email address',
  submitLabel: 'Join the Club',
  errors: { required: 'Enter your email address.', invalid: 'Enter a valid email address.' },
  success: 'Thanks — this is a demo, nothing was sent.',
};
const IDLE: NewsletterHandoff = { value: '', focus: null, submit: false };

const sendBeacon = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('XMLHttpRequest', vi.fn());
  Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  sendBeacon.mockReset();
});

const field = (): HTMLElement => screen.getByLabelText('Email address');
const form = (): HTMLElement => field().closest('form') as HTMLElement;
const clickSubmit = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /Join the Club/ }));
};

describe('NewsletterFields: the server-rendered form (FR-003)', () => {
  it('is plain markup with a visible label, an email field and a submit button', () => {
    render(<NewsletterFields copy={COPY} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Join the Club' })).toBeInTheDocument();
    expect(field()).toHaveAttribute('type', 'email');
    expect(screen.getByRole('button', { name: /Join the Club/ })).toHaveAttribute('type', 'submit');
  });

  it('does not name the field, so a submit without JavaScript puts the address nowhere (no query string)', () => {
    render(<NewsletterFields copy={COPY} />);

    expect(field()).not.toHaveAttribute('name');
  });
});

describe('NewsletterForm: the interactive island (FR-003, RULES 8.7, 10.5)', () => {
  it('asks for an address when the field is empty, wires the message to the field and focuses it', async () => {
    render(<NewsletterForm copy={COPY} handoff={IDLE} />);

    clickSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(COPY.errors.required);
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAttribute('aria-describedby', alert.id);
    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('announces the error when Enter is pressed inside an already focused field, with the wiring in place at focus time', async () => {
    render(<NewsletterForm copy={COPY} handoff={IDLE} />);
    field().focus();
    expect(field()).toHaveFocus();
    // What the field looks like each time something calls focus() on it.
    const seenAtFocus: Array<string | null> = [];
    const originalFocus = HTMLElement.prototype.focus;
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
      this: HTMLElement,
      options?: FocusOptions,
    ) {
      if (this.tagName === 'INPUT') seenAtFocus.push(this.getAttribute('aria-describedby'));
      originalFocus.call(this, options);
    });

    // Enter in a form field submits the form without any click.
    fireEvent.submit(form());

    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.errors.required);
    await waitFor(() => expect(field()).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() => expect(field()).toHaveFocus());
    // Focus was (re)applied only after React rendered the error, never before.
    expect(seenAtFocus.length).toBeGreaterThan(0);
    for (const describedBy of seenAtFocus) expect(describedBy).not.toBeNull();
  });

  it('re-announces a repeated identical error by replacing the alert node', async () => {
    render(<NewsletterForm copy={COPY} handoff={IDLE} />);

    fireEvent.submit(form());
    const first = await screen.findByRole('alert');
    fireEvent.submit(form());

    await waitFor(() => expect(screen.getByRole('alert')).not.toBe(first));
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.errors.required);
  });

  it('rejects a malformed address with the "valid address" message', async () => {
    render(<NewsletterForm copy={COPY} handoff={IDLE} />);

    fireEvent.change(field(), { target: { value: 'not-an-email' } });
    fireEvent.submit(form());

    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.errors.invalid);
    expect(screen.queryByText(COPY.success)).not.toBeInTheDocument();
  });

  it('confirms a valid address as a demo and moves focus to the confirmation', async () => {
    render(<NewsletterForm copy={COPY} handoff={IDLE} />);

    fireEvent.change(field(), { target: { value: 'peem@example.com' } });
    fireEvent.submit(form());

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(COPY.success);
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    await waitFor(() => expect(status).toHaveFocus());
  });

  it('keeps what was typed and the focus when it takes over from the server-rendered form', async () => {
    render(
      <NewsletterForm copy={COPY} handoff={{ value: 'peem@exa', focus: 'input', submit: false }} />,
    );

    expect(field()).toHaveValue('peem@exa');
    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('replays a submit that arrived before the code loaded', async () => {
    render(
      <NewsletterForm
        copy={COPY}
        handoff={{ value: 'peem@example.com', focus: null, submit: true }}
      />,
    );

    expect(await screen.findByRole('status')).toHaveTextContent(COPY.success);
  });

  it('sends and stores nothing: no fetch, XHR, beacon, storage or cookie', async () => {
    const cookieBefore = document.cookie;
    render(<NewsletterForm copy={COPY} handoff={IDLE} />);

    fireEvent.change(field(), { target: { value: 'peem@example.com' } });
    fireEvent.submit(form());
    await screen.findByRole('status');

    expect(fetch).not.toHaveBeenCalled();
    expect(XMLHttpRequest).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe(cookieBefore);
  });
});
