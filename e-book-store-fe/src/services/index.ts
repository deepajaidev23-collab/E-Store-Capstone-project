/**
 * Service singletons.
 *
 * Mirrors the pattern in repositories/index.ts.  All application code imports
 * from here — never directly from a concrete service implementation.
 *
 *   import { recommendationService } from '@/services'
 *
 * Controlled by the same VITE_USE_SUPABASE env var that selects repositories.
 */
export type { RecommendationService } from './RecommendationService'

import { bookRepository, orderRepository } from '@/repositories'
import { CatalogueRecommendationService } from './CatalogueRecommendationService'
import { MockRecommendationService } from './mock/MockRecommendationService'
import type { RecommendationService } from './RecommendationService'

const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true'

export const recommendationService: RecommendationService = useSupabase
  ? new CatalogueRecommendationService(bookRepository, orderRepository)
  : new MockRecommendationService(bookRepository)
