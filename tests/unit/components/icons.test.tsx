import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { ArrowRightIcon } from '@/components/ui/icons/arrow-right-icon';
import { AwardIcon } from '@/components/ui/icons/award-icon';
import { BagIcon } from '@/components/ui/icons/bag-icon';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { ChevronLeftIcon } from '@/components/ui/icons/chevron-left-icon';
import { ChevronRightIcon } from '@/components/ui/icons/chevron-right-icon';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { GlobeIcon } from '@/components/ui/icons/globe-icon';
import type { IconProps } from '@/components/ui/icons/icon-base';
import { InfoIcon } from '@/components/ui/icons/info-icon';
import { LeafIcon } from '@/components/ui/icons/leaf-icon';
import { MenuIcon } from '@/components/ui/icons/menu-icon';
import { MinusIcon } from '@/components/ui/icons/minus-icon';
import { PauseIcon } from '@/components/ui/icons/pause-icon';
import { PlayIcon } from '@/components/ui/icons/play-icon';
import { PlusIcon } from '@/components/ui/icons/plus-icon';
import { SearchIcon } from '@/components/ui/icons/search-icon';
import { TruckIcon } from '@/components/ui/icons/truck-icon';

const ICONS: Array<[string, (props: IconProps) => ReactElement]> = [
  ['menu', MenuIcon],
  ['search', SearchIcon],
  ['bag', BagIcon],
  ['arrow-right', ArrowRightIcon],
  ['close', CloseIcon],
  ['check', CheckIcon],
  ['plus', PlusIcon],
  ['minus', MinusIcon],
  ['chevron-left', ChevronLeftIcon],
  ['chevron-right', ChevronRightIcon],
  ['pause', PauseIcon],
  ['play', PlayIcon],
  ['award', AwardIcon],
  ['leaf', LeafIcon],
  ['truck', TruckIcon],
  ['globe', GlobeIcon],
  ['info', InfoIcon],
];

describe.each(ICONS)('%s icon', (_name, Icon) => {
  it('is decorative by default and follows the 24 grid, 1.5 stroke, currentColor spec', () => {
    const { container } = render(<Icon />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg?.querySelector('path, circle, rect, ellipse')).not.toBeNull();
  });

  it('becomes an image with an accessible name when labelled', () => {
    render(<Icon label="Icon label" />);

    expect(screen.getByRole('img', { name: 'Icon label' })).not.toHaveAttribute('aria-hidden');
  });

  it('accepts a size class', () => {
    const { container } = render(<Icon className="size-5" />);

    expect(container.querySelector('svg')).toHaveClass('size-5');
  });
});

describe('icon props (a11y)', () => {
  it('leaves `label` as the only way to name an icon: aria-label, aria-hidden and role are not props', () => {
    expectTypeOf<IconProps>().not.toHaveProperty('aria-label');
    expectTypeOf<IconProps>().not.toHaveProperty('aria-hidden');
    expectTypeOf<IconProps>().not.toHaveProperty('role');
    expectTypeOf<IconProps>().toHaveProperty('label');
  });

  it('never hides a labelled icon from assistive technology', () => {
    render(<SearchIcon label="Search" />);

    const icon = screen.getByRole('img', { name: 'Search' });
    expect(icon).not.toHaveAttribute('aria-hidden');
  });
});
