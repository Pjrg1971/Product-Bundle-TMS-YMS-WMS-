import { type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-tms-dark border border-tms-panel rounded-xl p-12 text-center">
        <p className="text-tms-muted text-sm">{emptyMessage || 'No data'}</p>
      </div>
    );
  }

  return (
    <div className="bg-tms-dark border border-tms-panel rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tms-panel">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-xs font-semibold text-tms-muted uppercase tracking-wider px-4 py-3"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-tms-panel/50 last:border-0 transition-colors ${
                  idx % 2 === 0 ? 'bg-tms-dark' : 'bg-tms-navy/30'
                } ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-tms-accent/10'
                    : 'hover:bg-tms-panel/30'
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-200 whitespace-nowrap">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
