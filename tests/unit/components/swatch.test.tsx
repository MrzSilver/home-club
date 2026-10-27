import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Swatch } from '@/components/ui/swatch';

describe('Swatch', () => {
  it('is decorative by default: hidden from assistive technology', () => {
    const { container } = render(<Swatch color="#d6bf9c" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('takes its fill from data through the inline style, the one allowed use of style', () => {
    const { container } = render(<Swatch color="#2b372d" />);

    expect(container.firstElementChild).toHaveStyle({ backgroundColor: '#2b372d' });
  });

  it('is a 16px circle with a 1px field ring so light colours stay visible', () => {
    const { container } = render(<Swatch color="#ffffff" />);

    expect(container.firstElementChild).toHaveClass(
      'size-4',
      'rounded-full',
      'border',
      'border-field',
    );
  });

  it('exposes the colour name as an image when a label is given', () => {
    render(<Swatch color="#141412" label="Black" />);

    expect(screen.getByRole('img', { name: 'Black' })).toBeInTheDocument();
  });
});
