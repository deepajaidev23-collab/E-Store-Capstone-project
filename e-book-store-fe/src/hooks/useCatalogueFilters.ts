/**
 * useCatalogueFilters — derives and manages the filter state that lives in
 * URL search params so that bookmarks, back-button and sharing all work.
 *
 * Keeps ALL filter logic here; presentational components receive values and
 * callbacks only — no URLSearchParams logic escapes this hook.
 */
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BookFilters, SortField } from '@/repositories/BookRepository'

export interface CatalogueFilterState {
  search: string
  categorySlug: string
  language: string
  format: string
  priceMin: string
  priceMax: string
  publisherId: string
  sort: SortField
  page: number
  pageSize: number
}

export interface CatalogueFilterHandlers {
  setSearch: (v: string) => void
  setCategorySlug: (v: string) => void
  setLanguage: (v: string) => void
  setFormat: (v: string) => void
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
  setPublisherId: (v: string) => void
  setSort: (v: SortField) => void
  setPage: (p: number) => void
  resetFilters: () => void
  /** Derived BookFilters ready to pass to the repository */
  toBookFilters: () => BookFilters
  /** True when any non-default filter is active */
  hasActiveFilters: boolean
}

export function useCatalogueFilters(): CatalogueFilterState & CatalogueFilterHandlers {
  const [params, setParams] = useSearchParams()

  const get = (key: string, def = '') => params.get(key) ?? def

  const state: CatalogueFilterState = {
    search:      get('q'),
    categorySlug:get('category', 'all'),
    language:    get('lang'),
    format:      get('format'),
    priceMin:    get('pmin'),
    priceMax:    get('pmax'),
    publisherId: get('pub'),
    sort:        (get('sort', 'relevance')) as SortField,
    page:        Math.max(1, parseInt(get('page', '1'), 10) || 1),
    pageSize:    12,
  }

  const set = useCallback(
    (updates: Partial<Record<string, string>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(updates)) {
            if (v) {
              next.set(k, v)
            } else {
              next.delete(k)
            }
          }
          // Reset to page 1 on any filter change
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const toBookFilters = useCallback((): BookFilters => {
    // Read directly from params (stable reference) to avoid capturing `state`
    const search       = params.get('q') ?? ''
    const categorySlug = params.get('category') ?? 'all'
    const language     = params.get('lang') ?? ''
    const format       = params.get('format') ?? ''
    const priceMin     = params.get('pmin') ?? ''
    const priceMax     = params.get('pmax') ?? ''
    const publisherId  = params.get('pub') ?? ''
    const sort         = (params.get('sort') ?? 'relevance') as SortField
    const pageNum      = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)

    const filters: BookFilters = {
      page: pageNum,
      pageSize: 12,
    }
    if (search)                               filters.search       = search
    if (categorySlug && categorySlug !== 'all') filters.categorySlug = categorySlug
    if (language)                             filters.language     = language
    if (format)                               filters.format       = format
    if (publisherId)                          filters.publisherId  = publisherId
    if (sort && sort !== 'relevance')         filters.sort         = sort

    const min = parseFloat(priceMin)
    const max = parseFloat(priceMax)
    if (!isNaN(min) && !isNaN(max) && max > min) {
      filters.priceRange = [min, max]
    } else if (!isNaN(min)) {
      filters.priceRange = [min, Infinity]
    } else if (!isNaN(max)) {
      filters.priceRange = [0, max]
    }

    if (sort) filters.sort = sort

    return filters
  }, [params])

  const hasActiveFilters =
    !!state.search ||
    (!!state.categorySlug && state.categorySlug !== 'all') ||
    !!state.language ||
    !!state.format ||
    !!state.priceMin ||
    !!state.priceMax ||
    !!state.publisherId ||
    state.sort !== 'relevance'

  return {
    ...state,
    setSearch:       (v) => set({ q: v }),
    setCategorySlug: (v) => set({ category: v }),
    setLanguage:     (v) => set({ lang: v }),
    setFormat:       (v) => set({ format: v }),
    setPriceMin:     (v) => set({ pmin: v }),
    setPriceMax:     (v) => set({ pmax: v }),
    setPublisherId:  (v) => set({ pub: v }),
    setSort:         (v) => set({ sort: v }),
    setPage:         (p) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (p <= 1) {
            next.delete('page')
          } else {
            next.set('page', String(p))
          }
          return next
        },
        { replace: true }
      )
    },
    resetFilters:    () => setParams({}, { replace: true }),
    toBookFilters,
    hasActiveFilters,
  }
}
