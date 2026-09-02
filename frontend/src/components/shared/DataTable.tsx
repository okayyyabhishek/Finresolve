import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  isMonospace?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedKey?: string;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  selectedKey,
  emptyMessage = 'No records found'
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      
      const comparison = valA < valB ? -1 : 1;
      return sortAsc ? comparison : -comparison;
    });
  }, [data, sortKey, sortAsc]);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-indigo-500/20 bg-slate-950/40">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-indigo-500/20 bg-indigo-950/30 text-slate-300">
            {columns.map((col) => {
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                  ? 'text-center'
                  : 'text-left';

              return (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`p-3 font-semibold text-xs uppercase tracking-wider ${alignClass} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-indigo-400' : ''
                  }`}
                >
                  <div
                    className={`inline-flex items-center gap-1 ${
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                    }`}
                  >
                    <span>{col.header}</span>
                    {col.sortable && sortKey === col.key && (
                      sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item, idx) => {
              const rawKey = keyExtractor(item);
              const key = typeof rawKey === 'object' ? `dt-${idx}` : `${rawKey}-${idx}`;
              const isSelected = selectedKey === rawKey;

              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`
                    transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${
                      isSelected
                        ? 'bg-indigo-600/20 border-l-4 border-indigo-500'
                        : 'hover:bg-indigo-950/20'
                    }
                  `}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    const monoClass = col.isMonospace ? 'font-mono' : '';

                    return (
                      <td key={col.key} className={`p-3 text-slate-300 ${alignClass} ${monoClass}`}>
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
