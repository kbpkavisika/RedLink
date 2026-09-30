import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

// One shimmering placeholder block; size it with classes, e.g. <Skeleton className="h-3 w-40" />
export function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden="true" className={clsx('shimmer block rounded-xs', className)} />;
}

// Varied widths so the placeholder looks like real rows, not a grid of identical bars
const widths = [
  ['w-[55%]', 'w-[35%]'],
  ['w-[70%]', 'w-[30%]'],
  ['w-[45%]', 'w-[40%]'],
  ['w-[62%]', 'w-[25%]'],
  ['w-[50%]', 'w-[38%]'],
  ['w-[66%]', 'w-[32%]'],
];

// Mirrors a Table row: 32px avatar, two text lines, badge on the right, 56px high
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <div className="h-9 border-b border-border bg-surface-sunken" />
      {Array.from({ length: rows }, (_, index) => {
        const [first, second] = widths[index % widths.length];
        return (
          <div key={index} className="flex h-14 items-center gap-3 border-b border-neutral-soft px-5 last:border-b-0">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className={clsx('h-3', first)} />
              <Skeleton className={clsx('h-2.5', second)} />
            </div>
            <Skeleton className="h-[22px] w-14 shrink-0 rounded-full" />
          </div>
        );
      })}
    </div>
  );
}
