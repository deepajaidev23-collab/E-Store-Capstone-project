import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { ErrorState } from '@/components/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.fatal('Unhandled React render error caught by ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleReset)
      }
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <ErrorState
            title="Something went wrong"
            message="An unexpected rendering error occurred. Please try reloading the page."
            onRetry={this.handleReset}
          />
        </div>
      )
    }

    return this.props.children
  }
}
