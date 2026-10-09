/**
 * HomePage — /
 *
 * Landing page showing bestseller and new-launch book carousels.
 * Data is fetched via existing hooks (no new API surface needed).
 */
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useBestsellerBooks, useNewLaunchBooks } from '@/hooks/useCatalogueData'
import { Heading, Text, Button, ProductCard, ProductCardSkeleton, ErrorState } from '@/components/ui'
import type { Book } from '@/types/book'

export function HomePage() {
  usePageTitle('Bibliophile — Discover Your Next Read')
  const navigate = useNavigate()

  const { data: bestsellers = [], isLoading: bsLoading, isError: bsError, refetch: bsRefetch } =
    useBestsellerBooks(6)
  const { data: newLaunches = [], isLoading: nlLoading, isError: nlError, refetch: nlRefetch } =
    useNewLaunchBooks(6)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section aria-labelledby="hero-heading">
        <div className="rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-8 py-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Heading as="h1" size="h2" id="hero-heading">
              Discover Your Next Read
            </Heading>
            <Text muted>Thousands of books across every genre. Find, save, and order in seconds.</Text>
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/catalogue')}>
            Browse Catalogue
          </Button>
        </div>
      </section>

      {/* Bestsellers */}
      <BookSection
        title="Bestsellers"
        id="bestsellers-heading"
        books={bestsellers}
        isLoading={bsLoading}
        isError={bsError}
        onRetry={() => void bsRefetch()}
        onSeeAll={() => navigate('/catalogue')}
      />

      {/* New Launches */}
      <BookSection
        title="New Launches"
        id="new-launches-heading"
        books={newLaunches}
        isLoading={nlLoading}
        isError={nlError}
        onRetry={() => void nlRefetch()}
        onSeeAll={() => navigate('/catalogue')}
      />
    </div>
  )
}

// ── BookSection ───────────────────────────────────────────────────────────────

function BookSection({
  title,
  id,
  books,
  isLoading,
  isError,
  onRetry,
  onSeeAll,
}: {
  title: string
  id: string
  books: Book[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onSeeAll: () => void
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-center justify-between mb-4">
        <Heading as="h2" size="h4" id={id}>{title}</Heading>
        <Button variant="ghost" size="sm" onClick={onSeeAll}>See all</Button>
      </div>

      {isError && (
        <ErrorState
          title={`Could not load ${title.toLowerCase()}`}
          message="Something went wrong. Please try again."
          onRetry={onRetry}
        />
      )}

      {!isError && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : books.map((book) => (
                <ProductCard
                  key={book.id}
                  book={{
                    id: book.id,
                    title: book.title,
                    author: book.author_name,
                    coverUrl: book.cover_url || undefined,
                    price: book.price,
                    format: book.format,
                    rating: book.average_rating,
                  }}
                />
              ))}
        </div>
      )}
    </section>
  )
}
