import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'

/**
 * AppLoadingGate — prevents the router from rendering until the initial
 * Supabase session hydration completes. This eliminates the navbar flicker
 * where the "Sign in" link briefly appears before the session is restored.
 *
 * Must be a child of AuthProvider (calls useAuth) and a parent of
 * RouterProvider.
 */
export function AppLoadingGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]"
        aria-label="Loading application"
        role="status"
      >
        <Spinner size={40} />
      </div>
    )
  }

  return <>{children}</>
}
