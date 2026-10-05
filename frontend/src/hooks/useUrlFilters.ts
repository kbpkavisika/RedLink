import { useSearchParams } from 'react-router-dom';

/**
 * A table's search and filters, kept in the URL (?q=kamal&group=O-), so reloading or sharing the link keeps them.
 * Other query parameters on the page (e.g. ?hospital=12 for an open side panel) are left alone.
 *
 *   const filters = useUrlFilters(['q', 'group', 'city'] as const);
 *   filters.values.group        // '' when not set
 *   filters.set('group', 'O-')  // '' or null removes it
 *   filters.clear()             // removes all of this table's keys
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ''])) as Record<K, string>;
  const active = keys.some((key) => values[key] !== '');

  const update = (changes: Partial<Record<K, string | null>>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes) as [K, string | null][]) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  return {
    values,
    active,
    set: (key: K, value: string | null) => update({ [key]: value } as Partial<Record<K, string | null>>),
    update,
    clear: () => update(Object.fromEntries(keys.map((key) => [key, null])) as Partial<Record<K, null>>),
  };
}
