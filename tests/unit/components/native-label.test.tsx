import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NativeLabel } from '@/components/ui/native-label';

describe('NativeLabel (FR-073, RULES 6.5)', () => {
  it('marks Thai text on an English page with lang="th"', () => {
    render(
      <p lang="en">
        <NativeLabel lang="th">ไทย</NativeLabel>
      </p>,
    );

    expect(screen.getByText('ไทย')).toHaveAttribute('lang', 'th');
  });

  it('marks English text on a Thai page with lang="en"', () => {
    render(
      <p lang="th">
        <NativeLabel lang="en">English</NativeLabel>
      </p>,
    );

    expect(screen.getByText('English')).toHaveAttribute('lang', 'en');
  });
});
