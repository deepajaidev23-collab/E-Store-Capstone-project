/**
 * RelatedReadsPanel — sidebar showing up to 3 books that share a category
 * with the current book.
 * Purely presentational; mirrors the BookSection adapter pattern.
 */
import { Link } from 'react-router-dom'
import { Heading, ProductCard, ProductCardSkeleton } from '@/components/ui'
import type { Book } from '@/types/book'

interface RelatedReadsPanelProps {
  books: Book[]
  loading: boolean
}

/** Maps domain Book → the shape expected by ProductCard */
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

export function RelatedReadsPanel({ books, loading }: RelatedReadsPanelProps) {
  return (
    <aside
      aria-label="Related Reads"
      aria-busy={loading}
      className="flex flex-col gap-3"
    >
      <Heading as="h2" size="h6">
        Related Reads
      </Heading>

      {loading ? (
        <div className="flex flex-col divide-y divide-[var(--color-border)]">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-4 py-6 text-center">
          <p className="text-sm text-[var(--color-text-muted)] mb-2">No related books found.</p>
          <Link
            to="/catalogue"
            className="text-sm text-[var(--color-text-link)] hover:underline no-underline"
          >
            Browse the catalogue
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--color-border)]">
          {books.map((book) => (
            <ProductCard
              key={book.id}
              book={toProductCardBook(book)}
              variant="compact"
              className="py-1"
            />
          ))}
        </div>
      )}
    </aside>
  )
}
