import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IconButton } from '@/components/ui/icon-button';

describe('IconButton (RULES 8.3, 8.4)', () => {
  it('is named by its label and is at least 44px square', () => {
    render(
      <IconButton label="Search">
        <svg aria-hidden="true" />
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toHaveClass('size-11');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('calls onClick when enabled', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Menu" onClick={onClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('stays focusable when disabled, inert, and described by its reason', () => {
    const onClick = vi.fn();
    render(
      <>
        <IconButton label="Cart" disabled disabledReasonId="why" onClick={onClick}>
          <svg aria-hidden="true" />
        </IconButton>
        <span id="why" hidden>
          The cart is coming soon.
        </span>
      </>,
    );

    const button = screen.getByRole('button', { name: 'Cart' });
    button.focus();
    fireEvent.click(button);

    expect(button).toHaveFocus();
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('The cart is coming soon.');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not reference a reason while enabled', () => {
    render(
      <IconButton label="Cart" disabledReasonId="why">
        <svg aria-hidden="true" />
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Cart' })).not.toHaveAttribute('aria-describedby');
  });
});
