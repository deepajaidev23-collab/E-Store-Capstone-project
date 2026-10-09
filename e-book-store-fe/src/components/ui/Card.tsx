import React from 'react'

type CardVariant = 'default' | 'elevated' | 'outlined'

const variantStyles: Record<CardVariant, string> = {
  default:  'bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)]',
  elevated: 'bg-[var(--color-bg-elevated)] shadow-[var(--shadow-md)]',
  outlined: 'bg-transparent border border-[var(--color-border)]',
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export function Card({ variant = 'default', padding = 'md', className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={[
        'rounded-[var(--radius-xl)] overflow-hidden',
        variantStyles[variant],
        paddingMap[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-3 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CardBody({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex-1 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-3 pt-3 border-t border-[var(--color-border)] ${className}`} {...rest}>
      {children}
    </div>
  )
}
