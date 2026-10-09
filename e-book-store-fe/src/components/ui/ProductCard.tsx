import { memo } from 'react'
import { Link } from 'react-router-dom'

interface ProductCardBook {
  id: string
  title: string
  author: string
  authorId?: string
  coverUrl?: string
  price: number
  format?: string
  genres?: string[]
  deliveryDate?: string
  rating?: number
  sells?: number
}

interface ProductCardProps {
  book: ProductCardBook
  /** compact = catalogue grid card; detail = full product page card */
  variant?: 'compact' | 'horizontal'
  onAddToCart?: (id: string) => void
  onAddToWishlist?: (id: string) => void
  className?: string
}

function ProductCardComponent({ book, variant = 'compact', onAddToCart, onAddToWishlist, className = '' }: ProductCardProps) {
  if (variant === 'horizontal') {
    return <HorizontalProductCard book={book} onAddToCart={onAddToCart} onAddToWishlist={onAddToWishlist} className={className} />
  }
  return <CompactProductCard book={book} className={className} />
}

export const ProductCard = memo(ProductCardComponent)

/* ── Compact card (catalogue grid) ─────────────────────────────────────── */
function CompactProductCard({ book, className }: { book: ProductCardBook; className?: string }) {
  return (
    <Link
      to={`/books/${book.id}`}
      className={[
        'group flex gap-3 rounded-[var(--radius-lg)] p-2 transition-colors no-underline',
        'hover:bg-[var(--color-bg-overlay)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${book.title} by ${book.author}`}
    >
      {/* Cover */}
      <BookCover title={book.title} coverUrl={book.coverUrl} size="lg" />

      {/* Meta */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--color-text-link)]">
          {book.title}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          by{' '}
          <span className="text-[var(--color-tag)]">{book.author}</span>
        </p>
        {book.format && (
          <p className="text-xs text-[var(--color-text-muted)]">{book.format}</p>
        )}
        {book.genres && book.genres.length > 0 && (
          <p className="text-xs text-[var(--color-tag)] line-clamp-1">
            {book.genres.join(', ')}
          </p>
        )}
        <p className="mt-1 text-base font-bold text-[var(--color-text-primary)]">₹{book.price}</p>
        {book.deliveryDate && (
          <p className="text-xs text-[var(--color-text-muted)]">Delivery by {book.deliveryDate}</p>
        )}
      </div>
    </Link>
  )
}

/* ── Horizontal card (cart / confirmation) ──────────────────────────────── */
function HorizontalProductCard({
  book,
  onAddToCart,
  onAddToWishlist,
  className,
}: {
  book: ProductCardBook
  onAddToCart?: (id: string) => void
  onAddToWishlist?: (id: string) => void
  className?: string
}) {
  return (
    <div
      className={[
        'flex gap-4 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] p-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <BookCover title={book.title} coverUrl={book.coverUrl} size="lg" />

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <Link to={`/books/${book.id}`} className="text-base font-semibold text-[var(--color-text-primary)] no-underline hover:text-[var(--color-text-link)] line-clamp-2">
          {book.title}
        </Link>
        <p className="text-sm text-[var(--color-text-muted)]">
          by <span className="text-[var(--color-tag)]">{book.author}</span>
        </p>
        {book.format && <p className="text-xs text-[var(--color-text-muted)]">{book.format}</p>}
        {book.genres && book.genres.length > 0 && (
          <p className="text-xs text-[var(--color-tag)]">{book.genres.join(', ')}</p>
        )}
        <p className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">₹{book.price}</p>
        {book.deliveryDate && (
          <p className="text-xs text-[var(--color-text-muted)]">Delivery by {book.deliveryDate}</p>
        )}
      </div>

      {(onAddToCart || onAddToWishlist) && (
        <div className="flex flex-col gap-2 shrink-0 pt-1">
          {onAddToCart && (
            <button
              onClick={() => onAddToCart(book.id)}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Add to Cart
              <CartIcon />
            </button>
          )}
          {onAddToWishlist && (
            <button
              onClick={() => onAddToWishlist(book.id)}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-secondary-fg)] hover:bg-[var(--color-secondary-hover)] transition-colors"
            >
              Add to Wishlist
              <WishlistIcon />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Book cover placeholder ─────────────────────────────────────────────── */
type CoverSize = 'sm' | 'md' | 'lg'

const coverSizeMap: Record<CoverSize, string> = {
  sm:  'w-14 h-[4.5rem]',
  md:  'w-20 h-28',
  lg:  'w-28 h-40',
}

export function BookCover({
  title,
  coverUrl,
  size = 'md',
  className = '',
}: {
  title: string
  coverUrl?: string
  size?: CoverSize
  className?: string
}) {
  return (
    <div
      className={[
        'rounded-[var(--radius-md)] overflow-hidden shrink-0 object-cover bg-[var(--color-bg-elevated)]',
        coverSizeMap[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-elevated)] p-1">
          <span className="text-[9px] text-center text-[var(--color-text-muted)] leading-tight font-medium">
            {title}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Inline icons ───────────────────────────────────────────────────────── */
function CartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function WishlistIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/* ── Star rating display ────────────────────────────────────────────────── */
export function StarRating({ value, max = 5, className = '' }: { value: number; max?: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} role="img" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < Math.round(value) ? 'var(--color-warning)' : 'none'}
          stroke="var(--color-warning)"
          strokeWidth="2"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  )
}
