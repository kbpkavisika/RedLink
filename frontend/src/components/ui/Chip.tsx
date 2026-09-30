import { X } from 'lucide-react';

interface ChipProps {
  // "Key: Value", e.g. "Group: AB−", "City: Jaffna"
  label: string;
  // When set, the chip shows a ✕ button that removes the filter
  onRemove?: () => void;
}

export function Chip({ label, onRemove }: ChipProps) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-primary-soft px-2.5 text-caption font-semibold text-primary-hover">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove filter ${label}`}
          className="-mr-1 inline-flex size-5 items-center justify-center rounded-full hover:bg-primary/10 focus-visible:shadow-focus focus-visible:outline-none"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
