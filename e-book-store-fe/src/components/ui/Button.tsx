import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50',
  secondary:
    'bg-[var(--color-secondary)] text-[var(--color-secondary-fg)] hover:bg-[var(--color-secondary-hover)] disabled:opacity-50',
  ghost:
    'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] disabled:opacity-50',
  danger:
    'bg-[var(--color-error)] text-[var(--color-error-fg)] hover:opacity-90 disabled:opacity-50',
  success:
    'bg-[var(--color-success)] text-[var(--color-success-fg)] hover:opacity-90 disabled:opacity-50',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm:  'px-3 py-1.5 text-xs rounded-[var(--radius-md)] gap-1.5',
  md:  'px-4 py-2 text-sm rounded-[var(--radius-md)] gap-2',
  lg:  'px-6 py-2.5 text-base rounded-[var(--radius-lg)] gap-2',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Optional icon rendered before the label */
  icon?: React.ReactNode
  /** Optional icon rendered after the label */
  trailingIcon?: React.ReactNode
  /** Render as full-width block */
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  trailingIcon,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center font-medium transition-colors cursor-pointer',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 12 : 16} />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </button>
  )
}

/** Minimal inline spinner used by Button */
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin shrink-0"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

/** Icon-only circular button */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: ButtonSize
  variant?: ButtonVariant
}

export function IconButton({ label, size = 'md', variant = 'ghost', className = '', children, ...rest }: IconButtonProps) {
  const paddingMap: Record<ButtonSize, string> = { sm: 'p-1.5', md: 'p-2', lg: 'p-2.5' }
  return (
    <button
      aria-label={label}
      className={[
        'inline-flex items-center justify-center rounded-full transition-colors cursor-pointer',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
        'min-w-[24px] min-h-[24px]',
        variantStyles[variant],
        paddingMap[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
