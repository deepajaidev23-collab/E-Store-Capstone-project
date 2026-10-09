import React from 'react'

/* ─── Generic data table ─────────────────────────────────────────────────── */

export interface TableColumn<T> {
  key: string
  header: React.ReactNode
  cell: (row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  rows: T[]
  getRowKey: (row: T, index: number) => React.Key
  onRowClick?: (row: T) => void
  caption?: string
  className?: string
  emptyMessage?: string
}

const alignMap = { left: 'text-left', center: 'text-center', right: 'text-right' }

export function Table<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  caption,
  className = '',
  emptyMessage = 'No data',
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] ${className}`}>
      <table className="w-full border-collapse text-sm">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={[
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]',
                  alignMap[col.align ?? 'left'],
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={getRowKey(row, idx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  'border-b border-[var(--color-border)] last:border-b-0 transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-[var(--color-bg-overlay)]' : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      'px-4 py-3 text-[var(--color-text-primary)]',
                      alignMap[col.align ?? 'left'],
                    ].join(' ')}
                  >
                    {col.cell(row, idx)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Order-summary row (checkout summary table variant) ─────────────────── */
interface SummaryRowProps {
  label: React.ReactNode
  value: React.ReactNode
  bold?: boolean
  highlighted?: boolean
}

export function SummaryRow({ label, value, bold = false, highlighted = false }: SummaryRowProps) {
  const base = 'flex items-center justify-between py-1.5 text-sm'
  const textClass = highlighted
    ? 'font-bold text-[var(--color-text-primary)] text-base'
    : bold
      ? 'font-semibold text-[var(--color-text-primary)]'
      : 'text-[var(--color-text-muted)]'

  return (
    <div className={`${base} ${textClass}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
