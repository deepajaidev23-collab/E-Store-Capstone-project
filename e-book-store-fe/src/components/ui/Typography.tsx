import React from 'react'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const headingSizeMap: Record<HeadingLevel, string> = {
  h1: 'text-4xl font-bold leading-tight',
  h2: 'text-3xl font-bold leading-tight',
  h3: 'text-2xl font-semibold leading-tight',
  h4: 'text-xl font-semibold leading-snug',
  h5: 'text-lg font-semibold leading-snug',
  h6: 'text-base font-semibold leading-snug',
}

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel
  /** Override the visual size independent of the semantic level */
  size?: HeadingLevel
  muted?: boolean
}

export function Heading({ as: Tag = 'h2', size, muted = false, className = '', children, ...rest }: HeadingProps) {
  const sizeClass = headingSizeMap[size ?? Tag]
  const colorClass = muted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
  return (
    <Tag className={`${sizeClass} ${colorClass} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'li'
  size?: 'xs' | 'sm' | 'base' | 'lg'
  muted?: boolean
  /** Render as a tag/genre link style */
  tag?: boolean
}

const textSizeMap = {
  xs:   'text-xs',
  sm:   'text-sm',
  base: 'text-base',
  lg:   'text-lg',
}

export function Text({ as: Tag = 'p', size = 'base', muted = false, tag = false, className = '', children, ...rest }: TextProps) {
  const sizeClass = textSizeMap[size]
  const colorClass = tag
    ? 'text-[var(--color-tag)] hover:underline cursor-pointer'
    : muted
      ? 'text-[var(--color-text-muted)]'
      : 'text-[var(--color-text-primary)]'

  return (
    <Tag className={`${sizeClass} ${colorClass} leading-relaxed ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ required, className = '', children, ...rest }: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-[var(--color-text-primary)] mb-1 ${className}`}
      {...rest}
    >
      {children}
      {required && <span className="text-[var(--color-error)] ml-1" aria-hidden="true">*</span>}
    </label>
  )
}

/** Inline price display e.g. ₹149 */
export function Price({ value, className = '' }: { value: number | string; className?: string }) {
  return (
    <span className={`text-lg font-bold text-[var(--color-text-primary)] ${className}`}>
      ₹{value}
    </span>
  )
}
