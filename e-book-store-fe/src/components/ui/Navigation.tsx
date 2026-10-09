import React from 'react'
import { Link, useLocation } from 'react-router-dom'

/* ─── Navbar ─────────────────────────────────────────────────────────────── */

interface NavItem {
  label: string
  href: string
}

interface NavbarProps {
  brand?: React.ReactNode
  items?: NavItem[]
  actions?: React.ReactNode
}

export function Navbar({ brand, items = [], actions }: NavbarProps) {
  const location = useLocation()

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[#111111] shadow-[var(--shadow-sm)]"
      role="banner"
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          {brand ?? (
            <Link
              to="/"
              className="flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)] no-underline"
            >
              {/* Grid icon matching screenshots */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Bibliophile
            </Link>
          )}
        </div>

        {/* Separator */}
        {items.length > 0 && (
          <div className="hidden h-5 w-px bg-[var(--color-border)] md:block mx-4" />
        )}

        {/* Nav links */}
        <ul className="hidden md:flex items-center gap-6 text-sm list-none m-0 p-0 flex-1">
          {items.map((item) => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'transition-colors no-underline',
                    active
                      ? 'text-[var(--color-text-primary)] font-medium'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Actions slot */}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </nav>
    </header>
  )
}

/* ─── Breadcrumbs ─────────────────────────────────────────────────────────── */

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${className}`}>
      <ol className="flex flex-wrap items-center gap-1 list-none m-0 p-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span className="text-[var(--color-text-muted)]" aria-hidden="true">
                  /
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  className={isLast ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-link)]'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-[var(--color-text-link)] hover:underline no-underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ─── Sidebar nav (catalogue categories) ─────────────────────────────────── */

interface SidebarNavItem {
  label: string
  href: string
  count?: number
}

interface SidebarNavProps {
  items: SidebarNavItem[]
  activeHref?: string
}

export function SidebarNav({ items, activeHref }: SidebarNavProps) {
  return (
    <nav aria-label="Category navigation">
      <ul className="flex flex-col gap-0.5 list-none m-0 p-0">
        {items.map((item) => {
          const active = item.href === activeHref
          return (
            <li key={item.href}>
              <Link
                to={item.href}
                className={[
                  'flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm no-underline transition-colors',
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-overlay)] hover:text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-xs opacity-70">{item.count}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
