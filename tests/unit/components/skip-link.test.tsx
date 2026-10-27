import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkipLink } from '@/components/ui/skip-link';

describe('SkipLink (FR-004)', () => {
  it('is a link to #main named by the label it is given', () => {
    render(<SkipLink label="Skip to content" />);

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  });

  it('can target another landmark id', () => {
    render(<SkipLink label="Aller au contenu" targetId="content" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '#content');
  });

  it('is hidden until focused and becomes visible on focus', () => {
    render(<SkipLink label="Skip to content" />);

    const link = screen.getByRole('link');
    expect(link).toHaveClass(
      '-translate-y-full',
      'opacity-0',
      'focus:translate-y-4',
      'focus:opacity-100',
    );
  });
});
