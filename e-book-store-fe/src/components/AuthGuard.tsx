import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingState } from '@/components/ui'
import { safeRedirectPath } from '@/lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingState message="Loading…" />
  }

  if (!user) {
    const next = safeRedirectPath(location.pathname)
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  return <>{children}</>
}
