import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-4">
      {/* Skip link for future-proofing if a header is ever added */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-[var(--radius-md)] focus:bg-[var(--color-bg-overlay)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-text-primary)] focus:shadow-[var(--shadow-lg)] focus:outline focus:outline-2 focus:outline-[var(--color-primary)]"
      >
        Skip to main content
      </a>

      {/* Logo at top */}
      <main id="main-content" tabIndex={-1} className="w-full max-w-sm focus:outline-none">
        <div className="mb-6 flex items-center justify-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--color-text-primary)]" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <Link to="/" className="text-lg font-bold text-[var(--color-text-primary)] no-underline">
            Bibliophile
          </Link>
        </div>

        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-lg)]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
