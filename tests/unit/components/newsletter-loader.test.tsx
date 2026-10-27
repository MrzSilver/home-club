import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NewsletterFields, type NewsletterCopy } from '@/components/layout/newsletter-fields';
import { NewsletterLoader } from '@/components/layout/newsletter-loader';

const COPY: NewsletterCopy = {
  title: 'Join the Club',
  description: 'Demo only.',
  emailLabel: 'Email address',
  submitLabel: 'Join the Club',
  errors: { required: 'Enter your email address.', invalid: 'Enter a valid email address.' },
  success: 'Thanks — this is a demo, nothing was sent.',
};

function renderLoader(): void {
  render(
    <NewsletterLoader copy={COPY}>
      <NewsletterFields copy={COPY} />
    </NewsletterLoader>,
  );
}

const field = (): HTMLInputElement => screen.getByLabelText('Email address');

describe('NewsletterLoader: the form stays server HTML until it is used (hydration cost)', () => {
  it('renders the plain server form and does not import the interactive code at load', () => {
    renderLoader();

    expect(field()).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('takes over on first focus, keeping the typed value and the focus on the field', async () => {
    renderLoader();
    const server = field();
    fireEvent.change(server, { target: { value: 'peem@exa' } });

    await act(async () => {
      server.focus();
    });

    // The interactive form replaces the markup: a new element, same value, focused.
    await waitFor(() => expect(field()).not.toBe(server));
    expect(field()).toHaveValue('peem@exa');
    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('after the swap, Enter in the field with nothing typed announces the error', async () => {
    renderLoader();
    await act(async () => {
      field().focus();
    });
    await waitFor(() => expect(field().closest('form')).not.toBeNull());
    await screen.findByLabelText('Email address');

    fireEvent.submit(field().closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.errors.required);
  });

  it('cancels a submit that arrives first, loads the form and replays it', async () => {
    renderLoader();
    fireEvent.change(field(), { target: { value: 'peem@example.com' } });

    const notPrevented = fireEvent.submit(field().closest('form') as HTMLFormElement);

    expect(notPrevented).toBe(false);
    expect(await screen.findByRole('status')).toHaveTextContent(COPY.success);
  });

  it('does not swap in the middle of a press on the button, so the click is not lost', async () => {
    renderLoader();
    const button = screen.getByRole('button', { name: /Join the Club/ });

    fireEvent.pointerDown(button);
    await act(async () => {
      await Promise.resolve();
    });
    // Still the server markup while the pointer is down.
    expect(screen.getByRole('button', { name: /Join the Club/ })).toBe(button);

    fireEvent.pointerUp(button);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Join the Club/ })).not.toBe(button),
    );
  });

  it('does not swap in the middle of a press on the field either, and then focuses the live field (touch)', async () => {
    renderLoader();
    const server = field();

    fireEvent.pointerDown(server);
    await act(async () => {
      await Promise.resolve();
    });
    expect(field()).toBe(server);

    fireEvent.pointerUp(server);
    await waitFor(() => expect(field()).not.toBe(server));
    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('treats press and release on the submit button as a submit, because the swap would eat the click', async () => {
    renderLoader();
    const button = screen.getByRole('button', { name: /Join the Club/ });

    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);

    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.errors.required);
  });

  it('does not submit when the press ends somewhere else (dragged off the button)', async () => {
    renderLoader();
    const button = screen.getByRole('button', { name: /Join the Club/ });

    fireEvent.pointerDown(button);
    fireEvent.pointerUp(field());
    await waitFor(() => expect(field().closest('form')).not.toBeNull());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Join the Club/ })).not.toBe(button),
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends nothing while loading', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderLoader();
    await act(async () => {
      field().focus();
    });
    await screen.findByLabelText('Email address');

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
