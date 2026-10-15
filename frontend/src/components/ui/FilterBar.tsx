import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface FilterBarProps {
  // SearchInput first, then FilterSelects / SegmentedControls
  children: ReactNode;
  // Rows after filtering, and before. Leave out while loading.
  shown?: number;
  total?: number;
  // True when any search or filter is applied: shows "Clear filters"
  active: boolean;
  onClear: () => void;
}

/**
 * The toolbar above every table: search and filters on the left, "12 of 46 · Clear filters" on the right.
 * Put it at the top of the table's Panel.
 */
export function FilterBar({ children, shown, total, active, onClear }: FilterBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
      {children}
      <div className="ml-auto flex items-center gap-3 text-label text-text-subtle">
        {shown !== undefined && total !== undefined && (
          <span aria-live="polite">{active ? t('ui.shownOf', { shown, total }) : t('ui.total', { total })}</span>
        )}
        {active && (
          <Button variant="text" size="sm" onClick={onClear}>
            {t('common.clearFilters')}
          </Button>
        )}
      </div>
    </div>
  );
}
