import type { ReactElement } from 'react';

import { ChevronLeftIcon } from '@/components/ui/icons/chevron-left-icon';
import { ChevronRightIcon } from '@/components/ui/icons/chevron-right-icon';
import { PauseIcon } from '@/components/ui/icons/pause-icon';
import { PlayIcon } from '@/components/ui/icons/play-icon';
import { IconButton } from '@/components/ui/icon-button';

// Round, outlined controls that read on any photograph (the hero carries data-on-dark, so the focus
// ring is the light one).
const CONTROL_CLASS = 'border border-canvas/70';
const PLAY_REASON_ID = 'hero-play-reason';

type IndicatorsProps = {
  labels: readonly string[];
  current: number;
  onSelect: (index: number) => void;
};

/**
 * Slide indicators, bottom-left (DESIGN 5.3): three short bars, the active one longer and thicker, so
 * the state does not rest on brightness alone. Each bar is a 44 x 44 px button named "Slide n of N".
 */
export function HeroIndicators({ labels, current, onSelect }: IndicatorsProps): ReactElement {
  return (
    <div className="pointer-events-auto flex gap-2">
      {labels.map((label, index) => {
        const active = index === current;
        return (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(index)}
            className="flex size-11 items-center justify-center rounded-md"
          >
            <span
              aria-hidden="true"
              className={`block rounded-full bg-canvas ${active ? 'h-1 w-8' : 'h-0.5 w-5 opacity-70'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

type ControlsProps = {
  previousLabel: string;
  nextLabel: string;
  playLabel: string;
  pauseLabel: string;
  playUnavailableLabel: string;
  playing: boolean;
  /** Autoplay cannot start (reduced motion): the toggle stays, inert, and says why. */
  playDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggle: () => void;
};

/** Previous, play/pause and next, bottom-right. Real buttons: Tab, Enter and Space work as usual. */
export function HeroControls({
  previousLabel,
  nextLabel,
  playLabel,
  pauseLabel,
  playUnavailableLabel,
  playing,
  playDisabled,
  onPrevious,
  onNext,
  onToggle,
}: ControlsProps): ReactElement {
  return (
    <div className="pointer-events-auto flex gap-2">
      <IconButton label={previousLabel} onClick={onPrevious} className={CONTROL_CLASS}>
        <ChevronLeftIcon className="size-5" />
      </IconButton>
      <IconButton
        label={playing ? pauseLabel : playLabel}
        onClick={onToggle}
        disabled={playDisabled}
        disabledReasonId={PLAY_REASON_ID}
        className={CONTROL_CLASS}
      >
        {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
      </IconButton>
      <span id={PLAY_REASON_ID} hidden>
        {playUnavailableLabel}
      </span>
      <IconButton label={nextLabel} onClick={onNext} className={CONTROL_CLASS}>
        <ChevronRightIcon className="size-5" />
      </IconButton>
    </div>
  );
}
