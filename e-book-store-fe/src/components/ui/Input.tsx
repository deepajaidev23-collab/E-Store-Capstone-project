import React, { useId } from 'react'

const baseInput =
  'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-overlay)] ' +
  'px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] ' +
  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...rest }, ref) => (
    <input
      ref={ref}
      className={[
        baseInput,
        error ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  ),
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', ...rest }, ref) => (
    <textarea
      ref={ref}
      className={[
        baseInput,
        'min-h-[100px] resize-y',
        error ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  ),
)
Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className = '', children, ...rest }, ref) => (
    <select
      ref={ref}
      className={[
        baseInput,
        'appearance-none pr-8',
        'bg-[image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' fill=\'none\' viewBox=\'0 0 12 8\'%3E%3Cpath stroke=\'%239ca3af\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M1 1l5 5 5-5\'/%3E%3C/svg%3E")]',
        'bg-no-repeat bg-[right_0.625rem_center]',
        error ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, ...rest }, ref) => {
    const generatedId = useId()
    const resolvedId = id ?? generatedId
    return (
    <label
      htmlFor={resolvedId}
      className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--color-text-primary)]"
    >
      <input
        ref={ref}
        id={resolvedId}
        type="checkbox"
        className={[
          'w-4 h-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-overlay)]',
          'checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1',
          'cursor-pointer transition-colors',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {label && <span>{label}</span>}
    </label>
  )},
)
Checkbox.displayName = 'Checkbox'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Accessible name for the search input. Defaults to "Search". */
  'aria-label'?: string
}

/** Search input with magnifier icon */
export function SearchInput({ className = '', 'aria-label': ariaLabel, ...rest }: SearchInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--color-text-muted)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        aria-label={ariaLabel ?? 'Search'}
        className={[
          baseInput,
          'pl-9',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </div>
  )
}
