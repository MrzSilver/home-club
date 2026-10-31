import type { ReactElement } from 'react';

import type { OgColors } from '@/components/og/og-assets';

export type OgCardProps = {
  colors: OgColors;
  wordmark: { name: string; descriptor: string };
  /** Small label above the title (category, "Journal"). */
  eyebrow?: string;
  title: string;
  /** Product colours: dynamic catalogue data, drawn as swatches with a ring like the site's. */
  swatches?: readonly string[];
  footer: string;
};

// Satori lays out with flexbox only and takes plain pixel numbers, so these sizes mirror the DESIGN
// scale (wordmark, eyebrow, display) by hand rather than through Tailwind.
function titleSize(title: string): number {
  if (title.length <= 24) return 104;
  if (title.length <= 48) return 80;
  return 64;
}

/** The 1200 x 630 card shared by the default, product and article images. */
export function OgCard({
  colors,
  wordmark,
  eyebrow,
  title,
  swatches = [],
  footer,
}: OgCardProps): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: 72,
        background: colors.canvas,
        color: colors.ink,
        fontFamily: 'Inter',
        borderLeft: `24px solid ${colors.sand}`,
      }}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Jost', fontWeight: 500 }}
      >
        <div
          style={{ fontSize: 40, letterSpacing: 12, textTransform: 'uppercase', lineHeight: 1.1 }}
        >
          {wordmark.name}
        </div>
        <div
          style={{
            fontSize: 20,
            letterSpacing: 10,
            textTransform: 'uppercase',
            color: colors.muted,
            marginTop: 6,
          }}
        >
          {wordmark.descriptor}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        {eyebrow ? (
          <div
            style={{
              fontSize: 26,
              letterSpacing: 5,
              textTransform: 'uppercase',
              color: colors.muted,
              marginBottom: 20,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: 'Jost',
            fontWeight: 500,
            fontSize: titleSize(title),
            lineHeight: 1.1,
            letterSpacing: 1,
          }}
        >
          {title}
        </div>
        {swatches.length ? (
          <div style={{ display: 'flex', marginTop: 36 }}>
            {swatches.map((hex) => (
              <div
                key={hex}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 16,
                  background: hex,
                  border: `2px solid ${colors.field}`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          borderTop: `2px solid ${colors.line}`,
          paddingTop: 24,
          fontSize: 26,
          color: colors.muted,
        }}
      >
        {footer}
      </div>
    </div>
  );
}
