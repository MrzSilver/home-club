import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SafeImage } from '@/components/ui/safe-image';

const props = {
  src: '/images/x.webp',
  width: 400,
  height: 500,
  className: 'aspect-gallery w-full',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SafeImage (SPEC 13a image failure)', () => {
  it('renders the image while it loads', () => {
    render(<SafeImage {...props} alt="Sand tee" />);
    expect(screen.getByRole('img', { name: 'Sand tee' }).tagName).toBe('IMG');
  });

  it('swaps to a labelled surface box on error, keeping alt and the box classes', () => {
    const onError = vi.fn();
    render(<SafeImage {...props} alt="Sand tee" onError={onError} />);
    fireEvent.error(screen.getByRole('img', { name: 'Sand tee' }));
    const box = screen.getByRole('img', { name: 'Sand tee' });
    expect(box.tagName).toBe('SPAN');
    expect(box).toHaveClass('bg-surface', 'aspect-gallery', 'w-full');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('shows an empty hidden box for a decorative image that fails', () => {
    const { container } = render(<SafeImage {...props} alt="" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    const box = container.querySelector('[data-image-fallback]');
    expect(box).toHaveAttribute('aria-hidden', 'true');
    expect(box).toBeEmptyDOMElement();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows the new image again when the source changes after a failure (look slot colour change)', () => {
    const { rerender } = render(<SafeImage {...props} alt="Sand tee" />);
    fireEvent.error(screen.getByRole('img', { name: 'Sand tee' }));
    expect(screen.getByRole('img', { name: 'Sand tee' }).tagName).toBe('SPAN');
    rerender(<SafeImage {...props} src="/images/y.webp" alt="Black tee" />);
    expect(screen.getByRole('img', { name: 'Black tee' }).tagName).toBe('IMG');
  });

  it('falls back when the image had already failed before hydration', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    render(<SafeImage {...props} alt="Sand tee" />);
    expect(screen.getByRole('img', { name: 'Sand tee' }).tagName).toBe('SPAN');
  });

  it('keeps the image when it is complete and has a size', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(400);
    render(<SafeImage {...props} alt="Sand tee" />);
    expect(screen.getByRole('img', { name: 'Sand tee' }).tagName).toBe('IMG');
  });
});
