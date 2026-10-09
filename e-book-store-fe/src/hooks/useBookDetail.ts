/**
 * useBookDetail — react-query hooks for the Book Detail page.
 * Pattern mirrors useCatalogueData.ts exactly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookRepository } from '@/repositories'

export function useBookDetail(bookId: string) {
  return useQuery({
    queryKey: ['books', bookId],
    queryFn: () => bookRepository.getBookById(bookId),
    enabled: !!bookId,
  })
}

export function useRelatedBooks(bookId: string, categoryIds: string[]) {
  return useQuery({
    queryKey: ['books', bookId, 'related', categoryIds],
    queryFn: () => bookRepository.getRelatedBooks(bookId, categoryIds),
    enabled: !!bookId && categoryIds.length > 0,
  })
}

export function useBookReviews(bookId: string) {
  return useQuery({
    queryKey: ['books', bookId, 'reviews'],
    queryFn: () => bookRepository.getReviews(bookId),
    enabled: !!bookId,
  })
}

export function useSubmitReview(bookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rating, body }: { rating: number; body: string }) =>
      bookRepository.submitReview(bookId, rating, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['books', bookId, 'reviews'] })
    },
  })
}
