import React from 'react'
import { Label } from './Typography'

/* ─── FormField wraps label + input + error message ─────────────────────── */
interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({ label, htmlFor, error, hint, required, className = '', children }: FormFieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined

  // Inject aria-describedby and aria-invalid onto the first child when there is an error
  const enhancedChildren = error && errorId
    ? React.Children.map(children, (child, index) => {
        if (index === 0 && React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
            'aria-describedby': errorId,
            'aria-invalid': true,
          })
        }
        return child
      })
    : children

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {enhancedChildren}
      {hint && !error && (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
      {error && <FormError id={errorId}>{error}</FormError>}
    </div>
  )
}

/* ─── Inline error text ──────────────────────────────────────────────────── */
export function FormError({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p id={id} role="alert" className={`text-xs text-[var(--color-error)] flex items-center gap-1 ${className}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {children}
    </p>
  )
}

/* ─── Section divider inside a form ─────────────────────────────────────── */
export function FormSection({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={`border-0 m-0 p-0 ${className}`}>
      {title && (
        <legend className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          {title}
        </legend>
      )}
      {children}
    </fieldset>
  )
}

/* ─── Character counter (for review textarea) ─────────────────────────── */
export function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = current / max
  const color = pct >= 1 ? 'text-[var(--color-error)]' : pct >= 0.8 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'
  return (
    <span aria-live="polite" aria-atomic="true" className={`text-xs tabular-nums ${color}`}>
      {current}/{max}
    </span>
  )
}
