/**
 * CataloguePage — the top-level catalogue route.
 *
 * Responsibilities:
 *  1. Read/write URL search params via useCatalogueFilters
 *  2. Fetch data via useCatalogueData hooks (react-query)
 *  3. Pass data + callbacks down to pure presentational components
 *
 * No business logic, no URL manipulation, no async calls live in child
 * components.
 */
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useCatalogueFilters } from '@/hooks/useCatalogueFilters'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  useCatalogueBooks,
  useCatalogueCategories,
  useCataloguePublishers,
  useBestsellerBooks,
  useNewLaunchBooks,
} from '@/hooks/useCatalogueData'
import { useFallbackRecommendations } from '@/hooks/useRecommendations'
import { CategorySidebar } from '@/components/catalogue/CategorySidebar'
import { CatalogueFiltersBar } from '@/components/catalogue/CatalogueFiltersBar'
import { BookSection } from '@/components/catalogue/BookSection'
import { ErrorState, LoadingState, Alert } from '@/components/ui'

export function CataloguePage() {
  const { categorySlug: paramSlug } = useParams<{ categorySlug?: string }>()

  const filters = useCatalogueFilters()

  // Sync URL path segment (/catalogue/:categorySlug) into filter state once
  useEffect(() => {
    if (paramSlug && paramSlug !== filters.categorySlug) {
      filters.setCategorySlug(paramSlug)
    }
    // only run when the path slug changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramSlug])

  // ── Data fetching ──────────────────────────────────────────────────────────
  const bookFilters = filters.toBookFilters()
  const isFiltering =
    filters.hasActiveFilters ||
    (filters.categorySlug !== '' && filters.categorySlug !== 'all')

  const { data: booksResult, isLoading: booksLoading, isError: booksError, refetch: refetchBooks } =
    useCatalogueBooks(bookFilters)

  const { data: categories = [], isLoading: catsLoading, isError: catsError } = useCatalogueCategories()

  // Dynamic page title — uses active category name when set
  const activeCategory = categories.find((c) => c.slug === filters.categorySlug)
  usePageTitle(activeCategory ? `${activeCategory.name} — Catalogue` : 'Catalogue')
  const { data: publishers = [], isError: pubsError } = useCataloguePublishers()
  const { data: recommended = [], isLoading: recLoading } = useFallbackRecommendations(6)
  const { data: bestsellers = [], isLoading: bsLoading } = useBestsellerBooks(6)
  const { data: newLaunches = [], isLoading: nlLoading } = useNewLaunchBooks(6)

  // ── Live region message for screen readers ─────────────────────────────────
  const liveMessage = booksLoading
    ? ''
    : isFiltering
      ? booksResult && booksResult.total > 0
        ? `${booksResult.total} book${booksResult.total !== 1 ? 's' : ''} found`
        : 'No books match your filters.'
      : ''

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-4 py-4" aria-label="Book catalogue">
      {/* Screen reader live region for filter result announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      {/* Filter bar — full width above the two-column layout */}
      <div className="mb-4">
        <CatalogueFiltersBar
          search={filters.search}
          language={filters.language}
          format={filters.format}
          priceMin={filters.priceMin}
          priceMax={filters.priceMax}
          publisherId={filters.publisherId}
          sort={filters.sort}
          hasActiveFilters={filters.hasActiveFilters}
          publishers={publishers}
          onSearch={filters.setSearch}
          onLanguage={filters.setLanguage}
          onFormat={filters.setFormat}
          onPriceMin={filters.setPriceMin}
          onPriceMax={filters.setPriceMax}
          onPublisher={filters.setPublisherId}
          onSort={filters.setSort}
          onReset={filters.resetFilters}
        />
      </div>

      <div className="flex gap-4">
        {/* ── Category sidebar ─────────────────────────────────────────── */}
        <aside
          className="hidden md:block w-44 shrink-0"
          aria-label="Category navigation"
        >
          {catsLoading ? (
            <LoadingState message="" className="py-4" />
          ) : catsError ? (
            <div className="p-3 bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              Categories unavailable
            </div>
          ) : (
            <CategorySidebar
              categories={categories}
              activeSlug={filters.categorySlug || 'all'}
              onSelect={(slug) => {
                filters.setCategorySlug(slug)
              }}
            />
          )}
        </aside>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <section className="flex-1 min-w-0 space-y-8" aria-label="Book listings" aria-busy={booksLoading}>
          {pubsError && (
            <Alert variant="warning" className="text-xs">
              Publisher filters are temporarily unavailable.
            </Alert>
          )}

          {booksError ? (
            <ErrorState
              title="Could not load books"
              message="Something went wrong fetching the catalogue. Please check your connection and try again."
              onRetry={() => refetchBooks()}
            />
          ) : isFiltering ? (
            /* ── Filtered / Search results with Pagination ───────────── */
            <div className="space-y-6">
              <BookSection
                title={
                  filters.search
                    ? `Results for "${filters.search}"`
                    : `${booksResult?.total ?? '…'} books found`
                }
                books={booksResult?.books ?? []}
                loading={booksLoading}
                skeletonCount={6}
                grid
                showAll
                emptyMessage="No books match your filters. Try adjusting your search or clearing filters."
              />

              {booksResult && booksResult.total > filters.pageSize && (
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Showing {(filters.page - 1) * filters.pageSize + 1} to{' '}
                    {Math.min(filters.page * filters.pageSize, booksResult.total)} of{' '}
                    {booksResult.total} books
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={filters.page <= 1}
                      onClick={() => filters.setPage(filters.page - 1)}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Page {filters.page} of {Math.ceil(booksResult.total / filters.pageSize)}
                    </span>
                    <button
                      type="button"
                      disabled={filters.page >= Math.ceil(booksResult.total / filters.pageSize)}
                      onClick={() => filters.setPage(filters.page + 1)}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Editorial home view (no active filters) ────────────── */
            <>
              <BookSection
                title="Recommended for You"
                books={recommended}
                loading={recLoading}
                skeletonCount={3}
                grid
              />

              <div className="border-t border-[var(--color-border)]" />

              <BookSection
                title="Bestsellers this Month"
                books={bestsellers}
                loading={bsLoading}
                skeletonCount={3}
                grid
              />

              <div className="border-t border-[var(--color-border)]" />

              <BookSection
                title="New Launches"
                books={newLaunches}
                loading={nlLoading}
                skeletonCount={3}
                grid
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
