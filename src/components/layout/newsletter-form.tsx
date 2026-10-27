'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { NewsletterFields, type NewsletterCopy } from '@/components/layout/newsletter-fields';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { parseNewsletterEmail } from '@/lib/newsletter';

export type NewsletterHandoff = {
  /** What the visitor had typed into the server-rendered field. */
  value: string;
  /** Where focus was, so it can be put back after the swap. */
  focus: 'input' | 'button' | null;
  /** The visitor already submitted: run the check on mount. */
  submit: boolean;
};

type NewsletterFormProps = { copy: NewsletterCopy; handoff: NewsletterHandoff };

type Status =
  { kind: 'idle' } | { kind: 'error'; message: string; attempt: number } | { kind: 'done' };

function statusFor(value: string, previous: Status | null, copy: NewsletterCopy): Status {
  const result = parseNewsletterEmail(value);
  if (result.ok) return { kind: 'done' };
  return {
    kind: 'error',
    message: copy.errors[result.reason],
    attempt: previous?.kind === 'error' ? previous.attempt + 1 : 1,
  };
}

/**
 * The interactive "Join the Club" form (FR-003), loaded on first use by `NewsletterLoader`. A demo:
 * the address is validated and then dropped. Nothing is sent and nothing is stored (RULES 10.5).
 * A failed check puts the message in an `alert` and moves focus to the field AFTER the render
 * that wires `aria-invalid` and `aria-describedby` to it, also when the visitor pressed Enter
 * inside the field. For a one-field form, that is the error summary of RULES 8.7. On success the
 * confirmation takes focus.
 */
export function NewsletterForm({ copy, handoff }: NewsletterFormProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  // A submit that arrived before this code did is evaluated in the first render, not in an effect.
  const [status, setStatus] = useState<Status>(() =>
    handoff.submit ? statusFor(handoff.value, null, copy) : { kind: 'idle' },
  );
  const [email, setEmail] = useState(status.kind === 'done' ? '' : handoff.value);

  function check(value: string): void {
    const next = statusFor(value, status, copy);
    if (next.kind === 'done') setEmail('');
    setStatus(next);
  }

  // Put focus back where it was when the server-rendered form gave way to this one.
  useEffect(() => {
    if (handoff.focus === 'input') inputRef.current?.focus();
    if (handoff.focus === 'button') buttonRef.current?.focus();
    // Once, on mount: the handoff is a snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the render that shows the error (so the field already has aria-invalid and the description),
  // and on every repeat, because `status` is a new object each time.
  useEffect(() => {
    if (status.kind === 'error') inputRef.current?.focus();
    if (status.kind === 'done') doneRef.current?.focus();
  }, [status]);

  if (status.kind === 'done') {
    return (
      <div>
        <h2 className="text-h3 uppercase-latin">{copy.title}</h2>
        <p
          ref={doneRef}
          role="status"
          tabIndex={-1}
          className="mt-3 flex min-h-11 items-start gap-2 text-body text-success"
        >
          <CheckIcon className="mt-1 size-5 shrink-0" />
          <span>{copy.success}</span>
        </p>
      </div>
    );
  }

  return (
    <NewsletterFields
      copy={copy}
      value={email}
      onValueChange={setEmail}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        check(email);
      }}
      error={status.kind === 'error' ? status.message : null}
      errorKey={status.kind === 'error' ? status.attempt : 0}
      inputRef={inputRef}
      buttonRef={buttonRef}
    />
  );
}
