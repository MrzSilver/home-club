import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Container } from '@/components/ui/container';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

describe('Container', () => {
  it('renders its element type and applies the page width and gutter tokens', () => {
    render(
      <Container as="section" className="py-section">
        content
      </Container>,
    );

    const container = screen.getByText('content');
    expect(container.tagName).toBe('SECTION');
    expect(container).toHaveClass('max-w-page', 'px-gutter', 'py-section');
  });
});

describe('VisuallyHidden', () => {
  it('keeps text in the accessibility tree while removing it from view', () => {
    render(<VisuallyHidden>Cart, 2 items</VisuallyHidden>);

    expect(screen.getByText('Cart, 2 items')).toHaveClass('sr-only');
  });
});
