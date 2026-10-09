/**
 * useRecommendations — React Query hooks for the RecommendationService.
 *
 * Components never call the service directly; they use these hooks so
 * data fetching, caching, and loading states are handled consistently.
 */
import { useQuery } from '@tanstack/react-query'
import { recommendationService } from '@/services'
import type { Book } from '@/types/book'

/**
 * Fetches scored recommendations for a given context book.
 * Used by BookDetailPage / RelatedReadsPanel.
 *
 * The query is disabled when `contextBook` is undefined (e.g. while the
 * book detail page is still loading).
 */
export function useRecommendations(contextBook: Book | undefined, limit = 6) {
  return useQuery({
    queryKey: ['recommendations', 'context', contextBook?.id ?? null, limit],
    queryFn: () => recommendationService.getRecommendations(contextBook!, limit),
    enabled: !!contextBook,
  })
}

/**
 * Fetches fallback recommendations when no context book is available.
 * Used by CataloguePage "Recommended for You" section.
 */
export function useFallbackRecommendations(limit = 6) {
  return useQuery({
    queryKey: ['recommendations', 'fallback', limit],
    queryFn: () => recommendationService.getFallbackRecommendations(limit),
  })
}
