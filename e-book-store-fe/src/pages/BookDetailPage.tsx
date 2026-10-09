/**
 * BookDetailPage — route page for /books/:bookId.
 *
 * Responsibilities (this file only):
 *  - Read bookId from URL params
 *  - Orchestrate all data hooks
 *  - Handle loading / 404 / error states at page level
 *  - Decide auth-based behaviour for Add to Cart / Add to Wishlist
 *  - Assemble the two-column responsive layout
 *
 * No business logic lives in the child components.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useBookDetail, useBookReviews, useSubmitReview } from '@/hooks/useBookDetail'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useAuth } from '@/hooks/useAuth'
import { useWishlist, useIsInWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist'
import { useIsInCart, useAddToCart } from '@/hooks/useCart'
import { Breadcrumbs, ErrorState, NotFoundState, Skeleton, ProductCardSkeleton, Alert } from '@/components/ui'
import { toUserErrorMessage } from '@/repositories/supabase/errors'
import { CoverGallery } from '@/components/book-detail/CoverGallery'
import { BookMeta } from '@/components/book-detail/BookMeta'
import { BookActions } from '@/components/book-detail/BookActions'
import { AuthorCard } from '@/components/book-detail/AuthorCard'
import { ReviewsSection } from '@/components/book-detail/ReviewsSection'
import { RelatedReadsPanel } from '@/components/book-detail/RelatedReadsPanel'

export function BookDetailPage() {
  const { bookId = '' } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── Book ───────────────────────────────────────────────────────────────────
  const {
    data: book,
    isLoading: bookLoading,
    isError: bookError,
    refetch: refetchBook,
  } = useBookDetail(bookId)

  // ── Cart state ─────────────────────────────────────────────────────────────
  const { data: isInCart = false } = useIsInCart(user?.id ?? '', bookId)
  const addToCartMutation = useAddToCart()
  const cartLoading = addToCartMutation.isPending

  // ── Wishlist state ─────────────────────────────────────────────────────────
  const { data: isInWishlist = false } = useIsInWishlist(user?.id ?? '', bookId)
  const { data: wishlistItems = [] }   = useWishlist(user?.id ?? '')
  const addToWishlistMutation    = useAddToWishlist()
  const removeFromWishlistMutation = useRemoveFromWishlist()
  const wishlistLoading =
    addToWishlistMutation.isPending || removeFromWishlistMutation.isPending

  // ── Page title ─────────────────────────────────────────────────────────────
  usePageTitle(book?.title ?? 'Book Details')

  // ── Recommendations + reviews ──────────────────────────────────────────────
  const { data: recommendedBooks = [], isLoading: recommendedLoading } = useRecommendations(book ?? undefined, 6)
  const { data: reviews = [], isLoading: reviewsLoading } = useBookReviews(bookId)
  const { mutateAsync: submitReviewMutation, error: submitMutationError } =
    useSubmitReview(bookId)

  const submitError = submitMutationError
    ? toUserErrorMessage(submitMutationError, 'Could not submit review. Please try again.')
    : null

  // ── Auth-gated action handlers ──────────────────────────────────────────────
  const handleAddToCart = () => {
    if (!user) {
      navigate(`/login?next=/books/${bookId}`)
      return
    }
    if (isInCart) {
      // Already in cart — navigate to cart
      navigate('/cart')
      return
    }
    addToCartMutation.mutate({ userId: user.id, bookId })
  }

  const handleAddToWishlist = () => {
    if (!user) {
      navigate(`/login?next=/books/${bookId}`)
      return
    }
    if (isInWishlist) {
      // Find the itemId from the already-cached wishlist list so we can
      // pass it to removeFromWishlist (which deletes by item id).
      const cachedItem = wishlistItems.find((i) => i.book_id === bookId)
      if (cachedItem) {
        removeFromWishlistMutation.mutate({ itemId: cachedItem.id, userId: user.id, bookId })
      }
    } else {
      addToWishlistMutation.mutate({ userId: user.id, bookId })
    }
  }

  // ── Submit review ───────────────────────────────────────────────────────────
  const handleSubmitReview = async (rating: number, body: string) => {
    await submitReviewMutation({ rating, body })
  }

  // ── Page-level states ──────────────────────────────────────────────────────
  if (bookLoading) {
    return <BookDetailSkeleton />
  }

  if (bookError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <ErrorState
          title="Could not load book"
          message="Something went wrong fetching this book. Please try again."
          onRetry={() => refetchBook()}
        />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <NotFoundState onGoHome={() => navigate('/catalogue')} />
      </div>
    )
  }

  // ── Breadcrumbs ─────────────────────────────────────────────────────────────
  const firstCategory = book.categories?.[0]
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Catalogue', href: '/catalogue' },
    ...(firstCategory
      ? [{ label: firstCategory.name, href: `/catalogue/${firstCategory.slug}` }]
      : []),
    { label: book.title },
  ]

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <Breadcrumbs items={breadcrumbs} className="mb-4" />

      {(addToCartMutation.isError || addToWishlistMutation.isError || removeFromWishlistMutation.isError) && (
        <Alert
          variant="error"
          className="mb-4"
          onDismiss={() => {
            addToCartMutation.reset()
            addToWishlistMutation.reset()
            removeFromWishlistMutation.reset()
          }}
        >
          {addToCartMutation.isError
            ? toUserErrorMessage(addToCartMutation.error, 'Could not add book to cart. Please try again.')
            : toUserErrorMessage(
                addToWishlistMutation.error || removeFromWishlistMutation.error,
                'Could not update wishlist. Please try again.',
              )}
        </Alert>
      )}

      {/* Two-column: main content + Related Reads sidebar */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Left column (main content) ────────────────────────────── */}
        <article className="flex-1 min-w-0 flex flex-col gap-8">
          {/* Hero: covers + meta + actions */}
          <section aria-label="Book details" className="flex flex-col sm:flex-row gap-5">
            <CoverGallery
              title={book.title}
              mainCoverUrl={book.cover_url}
              backCoverUrl={undefined}
            />
            <div className="flex flex-col gap-4 flex-1 min-w-0">
              <BookMeta
                title={book.title}
                author_name={book.author_name}
                publisher_name={book.publisher?.name ?? null}
                description={book.description}
                price={book.price}
                original_price={book.original_price}
                format={book.format}
                language={book.language}
                average_rating={book.average_rating}
                copies_sold={book.copies_sold}
                categories={book.categories ?? []}
              />
              <BookActions
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
                isInWishlist={isInWishlist}
                wishlistLoading={wishlistLoading}
                isInCart={isInCart}
                cartLoading={cartLoading}
              />
            </div>
          </section>

          {/* Author bio */}
          <AuthorCard
            authorName={book.author_name}
            authorBio={book.author_bio}
            avatarUrl={book.author_avatar_url}
          />

          {/* Reviews */}
          <ReviewsSection
            reviews={reviews}
            reviewsLoading={reviewsLoading}
            onSubmit={handleSubmitReview}
            submitError={submitError}
          />

          {/* Related Reads — mobile only (desktop is in the sidebar) */}
          <div className="md:hidden">
            <RelatedReadsPanel books={recommendedBooks} loading={recommendedLoading} />
          </div>
        </article>

        {/* ── Right sidebar (Related Reads — desktop only) ───────────── */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="sticky top-20">
            <RelatedReadsPanel books={recommendedBooks} loading={recommendedLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page-level loading skeleton ─────────────────────────────────────────── */
function BookDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4" aria-busy="true" aria-label="Loading book">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-2 mb-4">
        <Skeleton width="4rem" height="0.875rem" />
        <Skeleton width="5rem" height="0.875rem" />
        <Skeleton width="8rem" height="0.875rem" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-8">
          {/* Hero */}
          <div className="flex gap-5">
            <Skeleton width="7rem" height="10rem" rounded="var(--radius-lg)" />
            <div className="flex flex-col gap-3 flex-1">
              <Skeleton width="70%" height="1.5rem" />
              <Skeleton width="40%" height="0.875rem" />
              <Skeleton width="55%" height="0.75rem" />
              <Skeleton width="100%" height="3rem" />
              <Skeleton width="25%" height="1.75rem" />
              <Skeleton width="60%" height="0.875rem" />
              <Skeleton width="14rem" height="2.5rem" />
            </div>
          </div>

          {/* Author card skeleton */}
          <div className="flex gap-4">
            <Skeleton width="3.5rem" height="3.5rem" rounded="9999px" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton width="35%" height="0.875rem" />
              <Skeleton width="100%" height="4rem" />
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="hidden md:block w-64 shrink-0">
          <Skeleton width="6rem" height="1rem" className="mb-3" />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      </div>
    </div>
  )
}

