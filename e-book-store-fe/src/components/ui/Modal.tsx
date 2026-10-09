import React, { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  /** Optional subtitle / payable amount row */
  subtitle?: React.ReactNode
  children: React.ReactNode
  /** 'sm' | 'md' | 'lg' | 'xl' — default 'md' */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Do not show the × close button */
  hideClose?: boolean
  className?: string
}

const sizeMap = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-2xl',
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Modal({ open, onClose, title, subtitle, children, size = 'md', hideClose = false, className = '' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const savedFocusRef = useRef<Element | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    // Save the element that had focus before the modal opened
    savedFocusRef.current = document.activeElement

    // Move focus into the dialog panel
    const frame = requestAnimationFrame(() => {
      const panel = dialogRef.current
      if (!panel) return
      const first = panel.querySelectorAll<HTMLElement>(FOCUSABLE)[0]
      if (first) {
        first.focus()
      } else {
        panel.focus()
      }
    })

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab') {
        const panel = dialogRef.current
        if (!panel) return
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusable[0]
        const last  = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      // Restore focus to the opener when the modal closes
      ;(savedFocusRef.current as HTMLElement | null)?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[
          'relative w-full rounded-[var(--radius-xl)] bg-[var(--color-bg-overlay)] shadow-[var(--shadow-xl)] p-6',
          'focus:outline-none',
          sizeMap[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Header */}
        {(title || subtitle || !hideClose) && (
          <div className="flex items-start justify-between mb-4">
            <div>
              {title && (
                <h2 id={titleId} className="text-base font-semibold text-[var(--color-text-primary)]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">{subtitle}</p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="ml-4 shrink-0 rounded-full p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        {children}
      </div>
    </div>,
    document.body,
  )
}
