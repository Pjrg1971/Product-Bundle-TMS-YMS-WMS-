import { ReactNode } from 'react'

type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
}

export function DataTable<T>({ columns, rows }: Props<T>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-cl-panel/50">
          {columns.map((column) => (
            <th
              key={column.key}
              className="text-cl-muted text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={index}
            className={`${
              index % 2 === 0 ? 'bg-cl-dark' : 'bg-cl-navy/30'
            } hover:bg-cl-surface/30 transition-colors border-b border-cl-panel/50`}
          >
            {columns.map((column) => (
              <td key={column.key} className="px-4 py-3 text-cl-text-secondary">
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
