import type { ReactNode } from 'react';

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
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-cl-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-cl-panel/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-cl-muted text-xs uppercase tracking-wider font-medium text-left px-4 py-3"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={(row.id as string) ?? idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-cl-panel/50 hover:bg-cl-surface/30 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              } ${idx % 2 === 0 ? 'bg-cl-dark' : 'bg-cl-navy/30'}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-cl-text-secondary">
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
