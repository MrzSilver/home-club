'use client';

import { useRef, useState } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';

import type { NewsletterCopy } from '@/components/layout/newsletter-fields';
import type { NewsletterHandoff } from '@/components/layout/newsletter-form';

type FormComponent = ComponentType<{ copy: NewsletterCopy; handoff: NewsletterHandoff }>;

const loadForm = (): Promise<FormComponent> =>
  import('@/components/layout/newsletter-form').then((module) => module.NewsletterForm);

type NewsletterLoaderProps = {
  copy: NewsletterCopy;
  /** The server-rendered form: what everyone sees until they use it. */
  children: ReactNode;
};

/**
 * Keeps the newsletter form off the page's hydration path (measured: the form's code and state cost
 * about 20-30 ms of main-thread time on /th, which counts one for one toward TBT). The footer ships
 * the form as plain server HTML; this thin wrapper waits for the first focus, pointer press or
 * submit, loads the interactive form, and swaps it in with the same markup, keeping what was typed
 * and putting focus back. A submit that arrives before the code does is cancelled and replayed once
 * it has loaded, so nothing is lost. Without JavaScript the plain form stays, and it sends nothing.
 */
export function NewsletterLoader({ copy, children }: NewsletterLoaderProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const [Form, setForm] = useState<FormComponent | null>(null);
  const [handoff, setHandoff] = useState<NewsletterHandoff | null>(null);
  // A press in progress (pointer down, not yet up) must not lose its click or its focus to the swap.
  const [pressed, setPressed] = useState(false);
  const pressedOnButton = useRef(false);

  function start(focus: NewsletterHandoff['focus'], submit: boolean): void {
    const value = rootRef.current?.querySelector('input')?.value ?? '';
    setHandoff((previous) => ({
      value,
      focus: previous?.focus ?? focus,
      submit: (previous?.submit ?? false) || submit,
    }));
    if (Form === null) void loadForm().then((loaded) => setForm(() => loaded));
  }

  const active = Form !== null && handoff !== null && !pressed;

  return (
    <div
      ref={rootRef}
      onFocusCapture={(event) =>
        start(event.target instanceof HTMLButtonElement ? 'button' : 'input', false)
      }
      onPointerDownCapture={(event) => {
        // Only before the swap: once the live form is in, a press is just a press. Any target: on touch
        // devices the field's own focus event comes after the pointer is released, and a swap in
        // between would eat it, so the target also says where focus goes after the swap.
        if (active) return;
        setPressed(true);
        pressedOnButton.current = event.target instanceof HTMLButtonElement;
        start(
          event.target instanceof HTMLInputElement
            ? 'input'
            : event.target instanceof HTMLButtonElement
              ? 'button'
              : null,
          false,
        );
      }}
      onPointerUpCapture={(event) => {
        setPressed(false);
        // Released on the button it was pressed on: that is a click, and the swap would eat the click
        // event, so hand the submit over directly.
        if (pressedOnButton.current && event.target instanceof HTMLButtonElement) start(null, true);
        pressedOnButton.current = false;
      }}
      onPointerCancelCapture={() => {
        setPressed(false);
        pressedOnButton.current = false;
      }}
      onSubmitCapture={(event) => {
        if (active) return;
        event.preventDefault();
        setPressed(false);
        start(null, true);
      }}
    >
      {active ? <Form copy={copy} handoff={handoff} /> : children}
    </div>
  );
}
