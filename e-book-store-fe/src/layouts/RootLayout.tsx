import { useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Navbar, IconButton, Alert } from '@/components/ui'

/**
 * Announces route changes to screen readers and resets focus to main content.
 * Lives inside RootLayout so it re-runs on every client-side navigation.
 */
function RouteChangeAnnouncer() {
  const location = useLocation()
  const announcerRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the very first render — the page title is announced natively on load
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // Announce the new page title
    if (announcerRef.current) {
      announcerRef.current.textContent = ''
      // Use a short timeout so screen readers catch the update reliably
      const t = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = document.title
        }
      }, 100)
      return () => clearTimeout(t)
    }
    // Move focus to main content so keyboard users start from the top
    const main = document.getElementById('main-content')
    if (main) {
      main.focus()
    }
  }, [location.pathname, location.search])

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    />
  )
}

export function RootLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isOnline = useOnlineStatus()
  const { data: cartItems = [] } = useCart(user?.id ?? '')
  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0)

  const navItems = [
    { label: 'My Orders', href: '/orders' },
    { label: 'My Wishlist', href: '/wishlist' },
    { label: 'My Writers', href: '/catalogue' },
  ]

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    navigate('/')
  }

  const actions = (
    <>
      {/* Cart link — styled as icon button but a single <a> element (no nested button) */}
      <Link
        to="/cart"
        aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
        className="relative inline-flex items-center justify-center rounded-full min-w-[24px] min-h-[24px] p-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] transition-colors no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {cartCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-[10px] font-bold leading-none"
          >
            {cartCount > 9 ? '9+' : cartCount}
          </span>
        )}
      </Link>

      {/* Profile icon + sign-out (authenticated) or sign-in link (guest) */}
      {user ? (
        <>
          <IconButton
            label="Account"
            variant="ghost"
            size="md"
            onClick={() => navigate('/profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </IconButton>

          <IconButton
            label="Sign out"
            variant="ghost"
            size="md"
            onClick={() => void handleSignOut()}
          >
            {/* Log-out icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </IconButton>
        </>
      ) : (
        <Link
          to="/login"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] no-underline transition-colors"
        >
          Sign in
        </Link>
      )}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col bg-(--color-bg-base)">
      {/* Skip link — visible on focus, hidden otherwise */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-[var(--radius-md)] focus:bg-[var(--color-bg-overlay)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-text-primary)] focus:shadow-[var(--shadow-lg)] focus:outline focus:outline-2 focus:outline-[var(--color-primary)]"
      >
        Skip to main content
      </a>

      <RouteChangeAnnouncer />

      <Navbar items={navItems} actions={actions} />

      {!isOnline && (
        <div className="bg-amber-950/60 border-b border-[var(--color-warning)] px-4 py-2">
          <Alert variant="warning" className="mx-auto max-w-7xl py-1 text-xs">
            You are currently offline. Changes will sync once your internet connection is restored.
          </Alert>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] py-6 text-center text-sm text-[var(--color-text-muted)]">
        © {new Date().getFullYear()} Bibliophile. All rights reserved.
      </footer>
    </div>
  )
}
