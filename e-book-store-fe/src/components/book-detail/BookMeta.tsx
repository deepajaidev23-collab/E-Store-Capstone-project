/**
 * BookMeta — title, author, publisher, description, price, format/language
 * badges, star rating and sales count, and genre tags.
 * Purely presentational.
 */
import { Link } from 'react-router-dom'
import { Heading, Price, StarRating } from '@/components/ui'
import type { BookFormat, Category } from '@/types/book'

interface BookMetaProps {
  title: string
  author_name: string
  publisher_name: string | null
  description: string
  price: number
  original_price: number | null
  format: BookFormat
  language: string
  average_rating: number
  copies_sold: number
  categories: Category[]
}

const FORMAT_LABELS: Record<BookFormat, string> = {
  paperback: 'Paperback',
  ebook: 'eBook',
  hardcover: 'Hard Cover',
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  bn: 'Bengali',
}

export function BookMeta({
  title,
  author_name,
  publisher_name,
  description,
  price,
  original_price,
  format,
  language,
  average_rating,
  copies_sold,
  categories,
}: BookMetaProps) {
  const discounted = original_price !== null && original_price > price

  return (
    <div className="flex flex-col gap-3">
      {/* Title */}
      <Heading as="h1" size="h3">
        {title}
      </Heading>

      {/* Author */}
      <p className="text-sm text-[var(--color-text-muted)]">
        by{' '}
        <span className="text-[var(--color-tag)] font-medium">{author_name}</span>
      </p>

      {/* Publisher */}
      {publisher_name && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Published by:{' '}
          <span className="text-[var(--color-text-link)]">{publisher_name}</span>
        </p>
      )}

      {/* Description */}
      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
        {description}
      </p>

      {/* Format badge */}
      <p className="text-sm text-[var(--color-text-muted)]">
        {FORMAT_LABELS[format] ?? format}
      </p>

      {/* Genre / category links */}
      {categories.length > 0 && (
        <p className="text-xs">
          {categories.map((cat, i) => (
            <span key={cat.id}>
              {i > 0 && <span className="text-[var(--color-text-muted)]">, </span>}
              <Link
                to={`/catalogue/${cat.slug}`}
                className="text-[var(--color-tag)] hover:underline no-underline"
              >
                {cat.name}
              </Link>
            </span>
          ))}
        </p>
      )}

      {/* Price row */}
      <div className="flex items-baseline gap-3">
        <Price value={price} className="text-2xl" />
        {discounted && (
          <span className="text-sm text-[var(--color-text-muted)] line-through">
            ₹{original_price}
          </span>
        )}
      </div>

      {/* Rating + sales */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide">Language</span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {LANGUAGE_LABELS[language] ?? language}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide">Rating</span>
          <StarRating value={average_rating} />
        </span>
        <span className="flex items-center gap-1">
          <span className="text-xs uppercase tracking-wide">Sells</span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {copies_sold.toLocaleString()} copies sold
          </span>
        </span>
      </div>
    </div>
  )
}
