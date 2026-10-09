import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { AppLoadingGate } from '@/components/AppLoadingGate'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router'

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppLoadingGate>
            <RouterProvider router={router} />
          </AppLoadingGate>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
