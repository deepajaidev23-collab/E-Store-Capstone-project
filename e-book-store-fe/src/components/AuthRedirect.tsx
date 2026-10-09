import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingState } from '@/components/ui'
import { safeRedirectPath } from '@/lib/auth'

interface AuthRedirectProps {
  children: React.ReactNode
}

/**
 * Inverse of AuthGuard — redirects already-authenticated users away from
 * pages they no longer need (login, register).
 */
export function AuthRedirect({ children }: AuthRedirectProps) {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()

  if (loading) {
    return <LoadingState message="Loading…" />
  }

  if (user) {
    const next = safeRedirectPath(searchParams.get('next'))
    return <Navigate to={next} replace />
  }

  return <>{children}</>
}
