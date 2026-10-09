import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { ErrorState, NotFoundState } from '@/components/ui'
import { logger } from '@/lib/logger'

export function RouteErrorElement() {
  const error = useRouteError()
  const navigate = useNavigate()

  logger.error('Route error caught by RouteErrorElement', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <NotFoundState onGoHome={() => navigate('/')} />
      </div>
    )
  }

  const message = isRouteErrorResponse(error)
    ? error.statusText || error.data?.message || 'Page not available'
    : error instanceof Error
      ? error.message
      : 'We could not load this page. Please try again.'

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 flex justify-center">
      <ErrorState
        title="Page error"
        message={message}
        onRetry={() => window.location.reload()}
      />
    </div>
  )
}
