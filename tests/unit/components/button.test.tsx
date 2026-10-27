import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button, buttonClasses } from '@/components/ui/button';

describe('Button', () => {
  it('has the visible text as its accessible name and defaults to type=button', () => {
    render(<Button>Add to bag</Button>);

    const button = screen.getByRole('button', { name: 'Add to bag' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('keeps the accessible name when a decorative trailing arrow is shown', () => {
    render(<Button withArrow>Discover</Button>);

    expect(screen.getByRole('button', { name: 'Discover' })).toBeInTheDocument();
    expect(screen.getByRole('button').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    ['primary', ['bg-ink', 'text-canvas']],
    ['secondary', ['border-ink', 'bg-canvas', 'text-ink']],
    ['on-image', ['bg-canvas', 'text-ink']],
    ['link', ['underline']],
  ] as const)('renders the %s variant with its DESIGN 5.1 classes', (variant, classes) => {
    render(<Button variant={variant}>Label</Button>);

    expect(screen.getByRole('button')).toHaveClass(...classes);
  });

  it('keeps every size at or above the 44px touch target (RULES 8.3)', () => {
    expect(buttonClasses({ size: 'md' })).toContain('min-h-12');
    expect(buttonClasses({ size: 'sm' })).toContain('min-h-11');
  });

  it('is aria-disabled at 40% opacity, stays focusable and ignores clicks when disabled (DESIGN 5.1)', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Checkout
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Checkout' });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveClass('opacity-40');
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('never submits a form while disabled', () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button disabled type="submit">
          Pay
        </Button>
        <Button type="submit">Send</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('links the reason that explains a disabled button', () => {
    render(
      <>
        <Button disabled disabledReasonId="why">
          Add to bag
        </Button>
        <p id="why">Choose a size first</p>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Add to bag' })).toHaveAccessibleDescription(
      'Choose a size first',
    );
  });

  it('merges the reason with the description the caller already gave', () => {
    render(
      <>
        <Button disabled disabledReasonId="why" aria-describedby="hint">
          Add to bag
        </Button>
        <p id="hint">Ships in two days</p>
        <p id="why">Choose a size first</p>
      </>,
    );

    const button = screen.getByRole('button', { name: 'Add to bag' });
    expect(button).toHaveAttribute('aria-describedby', 'hint why');
    expect(button).toHaveAccessibleDescription('Ships in two days Choose a size first');
  });

  it('keeps the caller description alone when enabled, even if a reason id is passed', () => {
    render(
      <Button disabledReasonId="why" aria-describedby="hint">
        Add to bag
      </Button>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'hint');
  });

  it('has no description attribute when there is nothing to describe', () => {
    render(<Button>Go</Button>);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby');
  });

  it.each(['primary', 'secondary', 'on-image', 'link'] as const)(
    'gives the %s variant its hover shift only while it is not aria-disabled, and a not-allowed cursor when it is',
    (variant) => {
      render(<Button variant={variant}>Label</Button>);
      const classes = screen.getByRole('button').className.split(' ');

      const hover = classes.filter((name) => name.includes('hover:'));
      expect(hover.length).toBeGreaterThan(0);
      for (const name of hover) expect(name).toMatch(/^not-aria-disabled:hover:/);
      expect(classes).toContain('aria-disabled:cursor-not-allowed');
    },
  );

  it('does not animate the trailing arrow while disabled', () => {
    const { rerender } = render(<Button withArrow>Next</Button>);
    expect(screen.getByRole('button').querySelector('svg')).toHaveClass(
      'motion-safe:group-hover:translate-x-1',
    );

    rerender(
      <Button withArrow disabled>
        Next
      </Button>,
    );
    expect(screen.getByRole('button').querySelector('svg')).not.toHaveClass(
      'motion-safe:group-hover:translate-x-1',
    );
  });

  it('calls onClick when enabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('lets a link wear the button look through buttonClasses', () => {
    render(
      <a href="#shop" className={buttonClasses({ variant: 'on-image', fullWidth: true })}>
        Shop
      </a>,
    );

    expect(screen.getByRole('link', { name: 'Shop' })).toHaveClass('bg-canvas', 'w-full');
  });
});
