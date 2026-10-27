import type { FormEventHandler, ReactElement, Ref } from 'react';

import { buttonClasses } from '@/components/ui/button';
import { ArrowRightIcon } from '@/components/ui/icons/arrow-right-icon';
import { InfoIcon } from '@/components/ui/icons/info-icon';

export type NewsletterCopy = {
  title: string;
  description: string;
  emailLabel: string;
  submitLabel: string;
  errors: { required: string; invalid: string };
  success: string;
};

export const NEWSLETTER_FIELD_ID = 'newsletter-email';
const ERROR_ID = `${NEWSLETTER_FIELD_ID}-error`;

type NewsletterFieldsProps = {
  copy: NewsletterCopy;
  /** Interactive state; the server-rendered copy leaves all of these out. */
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  error?: string | null;
  /** Changes on every failed submit so the alert is re-announced even when its text is the same. */
  errorKey?: number;
  inputRef?: Ref<HTMLInputElement>;
  buttonRef?: Ref<HTMLButtonElement>;
};

/**
 * The "Join the Club" form markup, with no hooks, so the server renders it as plain HTML and the
 * interactive island (`newsletter-form.tsx`) renders the identical markup once it takes over.
 * The field has no `name`, so a submit without JavaScript sends nothing (the URL stays clean).
 */
export function NewsletterFields({
  copy,
  value,
  onValueChange,
  onSubmit,
  error = null,
  errorKey = 0,
  inputRef,
  buttonRef,
}: NewsletterFieldsProps): ReactElement {
  const controlled = value !== undefined && onValueChange !== undefined;

  return (
    <form noValidate onSubmit={onSubmit}>
      <h2 className="text-h3 uppercase-latin">{copy.title}</h2>
      <p className="mt-1 text-small text-muted">{copy.description}</p>
      <label htmlFor={NEWSLETTER_FIELD_ID} className="mt-4 block text-small font-medium">
        {copy.emailLabel}
      </label>
      <div className="mt-1 flex flex-col gap-2">
        <input
          ref={inputRef}
          id={NEWSLETTER_FIELD_ID}
          type="email"
          autoComplete="email"
          inputMode="email"
          {...(controlled ? { value, onChange: (event) => onValueChange(event.target.value) } : {})}
          aria-invalid={error === null ? undefined : true}
          aria-describedby={error === null ? undefined : ERROR_ID}
          className={[
            'min-h-12 w-full rounded-md border bg-canvas px-4 text-body text-ink',
            error === null ? 'border-field' : 'border-danger',
          ].join(' ')}
        />
        <button
          ref={buttonRef}
          type="submit"
          className={buttonClasses({ variant: 'primary', fullWidth: true })}
        >
          {copy.submitLabel}
          <ArrowRightIcon className="size-4" />
        </button>
      </div>
      {error === null ? null : (
        // A new key remounts the alert, so a repeated identical error is spoken again.
        <p
          key={errorKey}
          id={ERROR_ID}
          role="alert"
          className="mt-2 flex items-start gap-2 text-small text-danger"
        >
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </form>
  );
}
