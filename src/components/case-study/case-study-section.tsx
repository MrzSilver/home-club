import type { ReactElement, ReactNode } from 'react';

type CaseStudySectionProps = {
  id: string;
  heading: string;
  intro?: string | undefined;
  children?: ReactNode;
};

/** One titled block of the case study: an h2, an optional lead sentence, then the content. */
export function CaseStudySection({
  id,
  heading,
  intro,
  children,
}: CaseStudySectionProps): ReactElement {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-6">
      <h2 id={`${id}-heading`} className="text-h2 uppercase-latin">
        {heading}
      </h2>
      {intro ? <p className="max-w-prose">{intro}</p> : null}
      {children}
    </section>
  );
}
