
/* ─── Full-page / section spinner ───────────────────────────────────────── */
interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 32, className = '' }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={`animate-spin text-[var(--color-primary)] ${className}`}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading…', className = '' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={message}
      className={[
        'flex flex-col items-center justify-center gap-3 py-16 text-[var(--color-text-muted)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Spinner size={36} />
      <p className="text-sm">{message}</p>
    </div>
  )
}

/* ─── Skeleton primitives ───────────────────────────────────────────────── */
interface SkeletonProps {
  width?: string
  height?: string
  rounded?: string
  className?: string
}

export function Skeleton({ width = '100%', height = '1rem', rounded = 'var(--radius-md)', className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{ width, height, borderRadius: rounded }}
      className={`animate-pulse bg-[var(--color-bg-elevated)] ${className}`}
    />
  )
}

/* ─── Product card skeleton ─────────────────────────────────────────────── */
export function ProductCardSkeleton() {
  return (
    <div className="flex gap-3 p-2" aria-hidden="true">
      <Skeleton width="3.5rem" height="4.5rem" rounded="var(--radius-md)" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton width="80%" height="0.875rem" />
        <Skeleton width="50%" height="0.75rem" />
        <Skeleton width="30%" height="0.75rem" />
        <Skeleton width="25%" height="1rem" />
      </div>
    </div>
  )
}

/* ─── Table row skeletons ───────────────────────────────────────────────── */
export function TableRowSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIdx) => (
        <tr key={rowIdx} aria-hidden="true">
          {Array.from({ length: columns }, (_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <Skeleton height="0.875rem" width={colIdx === 0 ? '60%' : '80%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
