import React from 'react'

/* ─── Inline field error (banner/alert style) ────────────────────────────── */
type AlertVariant = 'error' | 'warning' | 'success' | 'info'

const alertStyles: Record<AlertVariant, { bg: string; border: string; icon: string; text: string }> = {
  error:   { bg: 'bg-red-950/40',    border: 'border-[var(--color-error)]',   icon: 'text-[var(--color-error)]',   text: 'text-red-200'   },
  warning: { bg: 'bg-amber-950/40',  border: 'border-[var(--color-warning)]', icon: 'text-[var(--color-warning)]', text: 'text-amber-200' },
  success: { bg: 'bg-green-950/40',  border: 'border-[var(--color-success)]', icon: 'text-[var(--color-success)]', text: 'text-green-200' },
  info:    { bg: 'bg-blue-950/40',   border: 'border-blue-400',               icon: 'text-blue-400',               text: 'text-blue-200'  },
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  onDismiss?: () => void
  className?: string
}

export function Alert({ variant = 'error', title, children, onDismiss, className = '' }: AlertProps) {
  const s = alertStyles[variant]
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={[
        `rounded-[var(--radius-lg)] border px-4 py-3 flex gap-3 text-sm`,
        s.bg, s.border, className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={`shrink-0 mt-0.5 ${s.icon}`}>
        <AlertIcon variant={variant} />
      </span>
      <div className={`flex-1 min-w-0 ${s.text}`}>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`shrink-0 hover:opacity-70 transition-opacity ${s.icon}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

function AlertIcon({ variant }: { variant: AlertVariant }) {
  if (variant === 'success') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  }
  if (variant === 'warning') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  if (variant === 'info') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )
  }
  // error
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

/* ─── Full-page error state ──────────────────────────────────────────────── */
interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] py-16 px-8 text-center',
        'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-[var(--color-error)]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <p className="text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-xs mx-auto">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}

/* ─── 404 / Not Found state ─────────────────────────────────────────────── */
export function NotFoundState({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center">
      <p className="text-8xl font-bold text-[var(--color-bg-elevated)] select-none">404</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">Page not found</p>
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
        The page you are looking for does not exist or has been moved.
      </p>
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Go to homepage
        </button>
      )}
    </div>
  )
}

/* ─── Payment error state ─────────────────────────────────────────────────── */
export function PaymentErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Payment failed"
      message="Your payment could not be processed. Please check your details and try again."
      onRetry={onRetry}
    />
  )
}
