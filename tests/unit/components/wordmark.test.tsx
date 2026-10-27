import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Wordmark } from '@/components/ui/wordmark';

describe('Wordmark (FR-073)', () => {
  it('renders the name and the sub-line as text', () => {
    render(<Wordmark name="Home Club" descriptor="Foundation" />);

    expect(screen.getByText('Home Club')).toBeInTheDocument();
    expect(screen.getByText('Foundation')).toBeInTheDocument();
  });

  it('declares itself English so Thai pages do not strip its casing or tracking', () => {
    const { container } = render(<Wordmark name="Home Club" />);

    expect(container.firstElementChild).toHaveAttribute('lang', 'en');
    expect(container.firstElementChild).toHaveClass('uppercase');
  });

  it('omits the sub-line when there is no descriptor', () => {
    const { container } = render(<Wordmark name="Home Club" />);

    expect(container.querySelectorAll('span > span')).toHaveLength(1);
  });
});
