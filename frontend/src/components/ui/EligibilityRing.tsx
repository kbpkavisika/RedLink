import clsx from 'clsx';

interface EligibilityRingProps {
  // null = never donated (counts as a full ring)
  daysSinceLastDonation: number | null;
  daysBetweenDonations: number;
  eligible: boolean;
}

const SIZE = 64;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * 64px ring of days since the last donation against the 90-day interval (design.md §7).
 * Full and green once the donor can give again; amber and filling up while they wait.
 * The ring is decorative: the card next to it says the same thing in words.
 */
export function EligibilityRing({ daysSinceLastDonation, daysBetweenDonations, eligible }: EligibilityRingProps) {
  const days = daysSinceLastDonation ?? daysBetweenDonations;
  const progress = Math.min(days, daysBetweenDonations) / daysBetweenDonations;

  return (
    <div className="relative size-16 shrink-0" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-16 -rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-neutral-soft" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          className={clsx('transition-[stroke-dashoffset] duration-500', eligible ? 'stroke-success' : 'stroke-warning-mid')}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono text-label font-medium text-ink">
          {daysSinceLastDonation === null ? '—' : Math.min(daysSinceLastDonation, 999)}
        </span>
        <span className="text-[10px] text-text-subtle">days</span>
      </span>
    </div>
  );
}
