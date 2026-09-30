import clsx from 'clsx';
import { Fragment } from 'react';

interface StepProgressProps {
  // e.g. ["Registered", "Under review", "Approved"]
  steps: string[];
  // Index of the step in progress; steps.length means everything is done
  current: number;
  // "error" for a stopped flow, e.g. a rejected hospital
  tone?: 'warning' | 'error';
}

// Multi-stage status such as hospital approval: "Registered · Under review · Approved"
export function StepProgress({ steps, current, tone = 'warning' }: StepProgressProps) {
  const currentColour = tone === 'error' ? 'bg-primary' : 'bg-warning-mid';
  const currentText = tone === 'error' ? 'text-primary' : 'text-warning';

  return (
    <div className="flex w-full max-w-[260px] flex-col gap-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {steps.map((step, index) => (
          <span
            key={step}
            className={clsx(
              'h-1 flex-1 rounded-full',
              index < current ? 'bg-success' : index === current ? currentColour : 'bg-neutral-soft',
            )}
          />
        ))}
      </div>
      <p className="text-caption text-text-subtle">
        {steps.map((step, index) => (
          <Fragment key={step}>
            {index > 0 && ' · '}
            {index === current ? (
              <strong className={clsx('font-semibold', currentText)} aria-current="step">
                {step}
              </strong>
            ) : (
              step
            )}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
