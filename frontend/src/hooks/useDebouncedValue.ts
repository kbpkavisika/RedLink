import { useEffect, useState } from 'react';

// The value, but only after it has stopped changing for `delay` ms, e.g. a search box that queries as you type
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
