/**
 * BookSection — one labelled row/grid of product cards.
 * Used for "Recommended for You", "Bestsellers this Month", "New Launches",
 * and the search-results grid.
 */
import type { Book } from '@/types/book'
import { ProductCard, ProductCardSkeleton, EmptyState } from '@/components/ui'

interface BookSectionProps {
  title: string
  books: Book[]
  loading?: boolean
  /** Number of skeleton cards to show while loading */
  skeletonCount?: number
  /** Show a 3-column grid instead of single-column list */
  grid?: boolean
  /** Compact: show all items; false: cap at 3 for editorial sections */
  showAll?: boolean
  emptyMessage?: string
}

/**
 * Converts a domain Book into the shape expected by ProductCard (UI model).
 * This is the only place that knows about both types.
 */
function toProductCardBook(book: Book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author_name,
    coverUrl: book.cover_url || undefined,
    price: book.price,
    format: book.format.charAt(0).toUpperCase() + book.format.slice(1),
    genres: (book.categories ?? []).map((c) => c.name),
    deliveryDate: 'Mon, 21 Jul',
    rating: book.average_rating,
  }
}

export function BookSection({
  title,
  books,
  loading = false,
  skeletonCount = 3,
  grid = false,
  showAll = false,
  emptyMessage = 'No books found.',
}: BookSectionProps) {
  const displayedBooks = showAll ? books : books.slice(0, 3)

  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>

      {loading ? (
        <div aria-busy={true} className={grid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0' : 'flex flex-col'}>
          {Array.from({ length: skeletonCount }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : displayedBooks.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description={emptyMessage}
          className="py-8 border-0 bg-transparent"
        />
      ) : (
        <div
          className={
            grid
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y divide-[var(--color-border)] divide-x-0 sm:divide-x sm:divide-y-0'
              : 'flex flex-col divide-y divide-[var(--color-border)]'
          }
        >
          {displayedBooks.map((book) => (
            <ProductCard
              key={book.id}
              book={toProductCardBook(book)}
              variant="compact"
              className="py-1"
            />
          ))}
        </div>
      )}
    </section>
  )
}
