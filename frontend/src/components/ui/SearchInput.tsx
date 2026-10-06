import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchInputProps {
  // The committed search (e.g. from the URL); onChange is called with the new one after typing pauses
  value: string;
  onChange: (value: string) => void;
  // Read by screen readers, e.g. "Search donors"
  label: string;
  placeholder?: string;
  delay?: number;
  className?: string;
}

/**
 * The search box for table toolbars. Typing updates the box at once but only reports a new search
 * once typing pauses (300 ms), so the table doesn't jump on every key. ✕ clears it straight away.
 */
export function SearchInput({ value, onChange, label, placeholder = 'Search…', delay = 300, className }: SearchInputProps) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The search was changed from outside (e.g. "Clear filters"): show it
  if (value !== synced) {
    setSynced(value);
    if (text.trim() !== value) setText(value);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const type = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next.trim()), delay);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setText('');
    onChange('');
  };

  return (
    <div className={className ?? 'relative w-full sm:w-72'}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(event) => type(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && text && clear()}
        className="h-10 w-full rounded-lg border border-border-strong bg-surface pr-9 pl-9 text-body text-ink placeholder:text-placeholder focus:border-primary focus:shadow-focus focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="hit-target absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-text-subtle hover:bg-bg hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
