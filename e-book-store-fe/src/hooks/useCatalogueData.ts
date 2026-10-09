/**
 * useCatalogueData — fetches all data the CataloguePage needs via
 * @tanstack/react-query.  All async work lives here; components are
 * pure render functions.
 */
import { useQuery } from '@tanstack/react-query'
import { bookRepository } from '@/repositories'
import type { BookFilters } from '@/repositories/BookRepository'

export function useCatalogueBooks(filters: BookFilters) {
  return useQuery({
    queryKey: ['catalogue', 'books', filters],
    queryFn: () => bookRepository.getBooks(filters),
  })
}

export function useCatalogueCategories() {
  return useQuery({
    queryKey: ['catalogue', 'categories'],
    queryFn: () => bookRepository.getCategories(),
    staleTime: Infinity,
  })
}

export function useCataloguePublishers() {
  return useQuery({
    queryKey: ['catalogue', 'publishers'],
    queryFn: () => bookRepository.getPublishers(),
    staleTime: Infinity,
  })
}

export function useRecommendedBooks() {
  return useQuery({
    queryKey: ['catalogue', 'recommended'],
    queryFn: () => bookRepository.getRecommendedBooks(),
  })
}

export function useBestsellerBooks(limit?: number) {
  return useQuery({
    queryKey: ['catalogue', 'bestsellers', limit],
    queryFn: () => bookRepository.getBestsellerBooks(limit),
  })
}

export function useNewLaunchBooks(limit?: number) {
  return useQuery({
    queryKey: ['catalogue', 'new-launches', limit],
    queryFn: () => bookRepository.getNewLaunchBooks(limit),
  })
}
