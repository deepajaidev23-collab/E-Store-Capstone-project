/**
 * ReviewsSection — "Leave Your Review" form + list of existing reviews.
 * Purely presentational; receives reviews and callbacks from the page.
 */
import { useState } from 'react'
import { Heading, Textarea, Button, Alert, StarRating, LoadingState, EmptyState, CharCounter } from '@/components/ui'
import type { Review } from '@/types/review'

interface ReviewsSectionProps {
  reviews: Review[]
  reviewsLoading: boolean
  onSubmit: (rating: number, body: string) => Promise<void>
  submitError: string | null
}

export function ReviewsSection({ reviews, reviewsLoading, onSubmit, submitError }: ReviewsSectionProps) {
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const MAX_CHARS = 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0 || body.trim() === '') return
    setSubmitting(true)
    setSuccess(false)
    try {
      await onSubmit(rating, body.trim())
      setBody('')
      setRating(0)
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section aria-label="Reviews">
      <Heading as="h2" size="h5" className="mb-4">
        Reviews
      </Heading>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        {/* ── Leave a review form ─────────────────────────────────────── */}
        <div className="md:w-2/5 shrink-0">
          <Heading as="h3" size="h6" className="mb-3">
            Leave Your Review
          </Heading>

          {submitError && (
            <Alert variant="error" className="mb-3">
              {submitError}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-3">
              Review submitted!
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            {/* Character counter + textarea */}
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[var(--color-text-muted)]">Your review</span>
                <CharCounter current={body.length} max={MAX_CHARS} />
              </div>
              <Textarea
                placeholder="Placeholder text"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_CHARS))}
                rows={4}
                aria-label="Review text"
                aria-required="true"
              />
            </div>

            {/* Star picker */}
            <div className="flex items-center gap-1" role="group" aria-label="Select your rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} out of 5`}
                  aria-pressed={rating === star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="p-2 text-[var(--color-warning)] transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={(hovered || rating) >= star ? 'var(--color-warning)' : 'none'}
                    stroke="var(--color-warning)"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                disabled={rating === 0 || body.trim() === ''}
                aria-busy={submitting}
                trailingIcon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                }
              >
                Submit
              </Button>
            </div>
          </form>
        </div>

        {/* ── Review list ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {reviewsLoading ? (
            <LoadingState message="Loading reviews…" className="py-8" />
          ) : reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Be the first to review this book."
              className="py-8 border-dashed"
            />
          ) : (
            <ul className="flex flex-col gap-4 list-none m-0 p-0">
              {reviews.map((review) => (
                <li key={review.id}>
                  <ReviewItem review={review} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── ReviewItem ─────────────────────────────────────────────────────────── */
function ReviewItem({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <article
      aria-label={`Review by ${review.reviewer_name}`}
      className="flex flex-col gap-1.5 pb-4 border-b border-[var(--color-border)] last:border-b-0"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {review.reviewer_name}
        </p>
        <time
          dateTime={review.created_at}
          className="text-xs text-[var(--color-text-muted)] shrink-0"
        >
          {date}
        </time>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{review.body}</p>
      <StarRating value={review.rating} />
    </article>
  )
}
