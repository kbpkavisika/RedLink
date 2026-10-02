import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  // Read by screen readers only, e.g. "Donors"
  caption?: string;
  // Highlights one row, e.g. the item open in a detail panel (also sets aria-current)
  isSelected?: (row: T) => boolean;
}

// 36px header row, 56px body rows. Put it inside a Panel; it scrolls sideways on narrow screens.
export function Table<T>({ columns, rows, rowKey, caption, isSelected }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="h-9 border-b border-border bg-surface-sunken">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  'px-5 text-caption font-semibold whitespace-nowrap text-text-subtle',
                  column.align === 'right' && 'text-right',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = isSelected?.(row) ?? false;
            return (
              <tr
                key={rowKey(row)}
                aria-current={selected ? 'true' : undefined}
                className={clsx('h-14 border-b border-neutral-soft last:border-b-0', selected && 'bg-primary-soft/60')}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx('px-5 text-body text-ink', column.align === 'right' && 'text-right', column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
