import { QueryClient } from '@tanstack/react-query'
import { isRepositoryError } from '@/repositories/supabase/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Do not retry 4xx errors, auth errors, not found, or explicit non-retryables
        if (isRepositoryError(error) && !error.retryable) {
          return false
        }
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
    },
  },
})
