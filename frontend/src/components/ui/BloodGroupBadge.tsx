import clsx from 'clsx';
import { formatBloodGroup } from '../../lib/format';
import type { BloodGroup } from '../../types';

const sizes = {
  sm: 'size-8 rounded-lg text-label', // table rows
  md: 'size-9 rounded-lg text-body',
  lg: 'size-[52px] rounded-2xl text-title-md', // profile headers
};

interface BloodGroupBadgeProps {
  group: BloodGroup;
  size?: keyof typeof sizes;
}

export function BloodGroupBadge({ group, size = 'sm' }: BloodGroupBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center bg-ink font-mono font-medium text-white',
        sizes[size],
      )}
    >
      <span className="sr-only">Blood group </span>
      {formatBloodGroup(group)}
    </span>
  );
}
