import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandMark } from '@/components/ui/brand-mark';

describe('BrandMark', () => {
  it('is hidden from assistive technology when decorative', () => {
    const { container } = render(<BrandMark />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('is an image with an accessible name when labelled', () => {
    render(<BrandMark label="Home Club" />);

    const mark = screen.getByRole('img', { name: 'Home Club' });
    expect(mark).not.toHaveAttribute('aria-hidden');
  });

  it('inherits the text colour so it works on light and dark surfaces', () => {
    const { container } = render(<BrandMark />);

    expect(container.querySelector('svg')).toHaveAttribute('stroke', 'currentColor');
  });
});
