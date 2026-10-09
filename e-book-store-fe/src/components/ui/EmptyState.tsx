import React from 'react'

interface EmptyStateProps {
  /** SVG icon element to display above the message */
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] py-16 px-8 text-center',
        'bg-[var(--color-bg-surface)] border border-[var(--color-border)] border-dashed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      {icon ? (
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      ) : (
        <DefaultEmptyIcon />
      )}
      <div className="space-y-1">
        <p className="text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
        {description && (
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

function DefaultEmptyIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--color-text-muted)]"
      aria-hidden="true"
    >
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
  )
}

/* ─── Wishlist-empty variant ─────────────────────────────────────────────── */
export function WishlistEmpty({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      }
      title="Your wishlist is empty"
      description="Browse books and save the ones you love."
      action={
        onBrowse && (
          <button
            onClick={onBrowse}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Browse books
          </button>
        )
      }
    />
  )
}

/* ─── Cart-empty variant ─────────────────────────────────────────────────── */
export function CartEmpty({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      }
      title="Your cart is empty"
      description="Add books you want to buy and they'll appear here."
      action={
        onBrowse && (
          <button
            onClick={onBrowse}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Browse books
          </button>
        )
      }
    />
  )
}
