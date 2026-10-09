/**
 * WishlistPage — authenticated user's saved books.
 *
 * Features:
 *  - Lists all wishlist items (ProductCard horizontal variant) newest-first
 *  - Remove individual item (optimistic — instant feedback)
 *  - Move to Cart (stubbed; wired in Cart phase)
 *  - Clear all button
 *  - Loading skeleton, error state, and empty state
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  useWishlist,
  useRemoveFromWishlist,
  useClearWishlist,
} from '@/hooks/useWishlist'
import { useAddToCart } from '@/hooks/useCart'
import { toUserErrorMessage } from '@/repositories/supabase/errors'
import {
  Heading,
  Text,
  Button,
  ProductCard,
  WishlistEmpty,
  ErrorState,
  ProductCardSkeleton,
  Alert,
} from '@/components/ui'

export function WishlistPage() {
  usePageTitle('My Wishlist')
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const { data: items = [], isLoading, isError, refetch } = useWishlist(userId)
  const removeMutation   = useRemoveFromWishlist()
  const clearMutation    = useClearWishlist()
  const addToCartMutation = useAddToCart()

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-40 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] animate-pulse mb-6" />
        <div className="flex flex-col gap-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState
          title="Could not load wishlist"
          message="Something went wrong. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Heading as="h1" className="mb-6">My Wishlist</Heading>
        <WishlistEmpty onBrowse={() => navigate('/catalogue')} />
      </div>
    )
  }

  // ── List ──────────────────────────────────────────────────────────────────
  const handleRemove = (itemId: string, bookId: string) => {
    removeMutation.mutate({ itemId, userId, bookId })
  }

  const handleMoveToCart = (bookId: string) => {
    if (!userId) return
    addToCartMutation.mutate(
      { userId, bookId },
      {
        onSuccess: () => {
          // After adding to cart, remove from wishlist for the item that was moved
          const item = items.find((i) => i.book_id === bookId)
          if (item) removeMutation.mutate({ itemId: item.id, userId, bookId })
        },
      },
    )
  }

  const handleClearAll = () => {
    clearMutation.mutate(userId)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Heading as="h1">My Wishlist</Heading>
          <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs font-semibold px-2 py-0.5 min-w-[1.5rem]">
            {items.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          loading={clearMutation.isPending}
        >
          Clear all
        </Button>
      </div>

      {/* Mutation error banner */}
      {(removeMutation.isError || clearMutation.isError || addToCartMutation.isError) && (
        <Alert variant="error" className="mb-4" onDismiss={() => {
          removeMutation.reset()
          clearMutation.reset()
          addToCartMutation.reset()
        }}>
          {toUserErrorMessage(
            removeMutation.error || clearMutation.error || addToCartMutation.error,
            'Could not update wishlist. Please try again.',
          )}
        </Alert>
      )}

      {/* Wishlist items */}
      <div className="flex flex-col gap-4">
        {items.map((item) => {
          if (!item.book) {
            // Book embed missing — fallback placeholder
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
              >
                <Text size="sm" muted>Book unavailable</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(item.id, item.book_id)}
                >
                  Remove
                </Button>
              </div>
            )
          }

          // Map domain Book → ProductCardBook shape
          const cardBook = {
            id: item.book.id,
            title: item.book.title,
            author: item.book.author_name,
            coverUrl: item.book.cover_url || undefined,
            price: item.book.price,
            format: item.book.format,
            genres: (item.book.categories ?? []).map((c) => c.name),
          }

          return (
            <div
              key={item.id}
              className="relative rounded-[var(--radius-xl)] border border-[var(--color-border)] overflow-hidden"
            >
              <ProductCard book={cardBook} variant="horizontal" />

              {/* Action row below the card */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]">
                <Text size="xs" muted>
                  Added {new Date(item.added_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveToCart(item.book_id)}
                    icon={<CartIcon />}
                  >
                    Move to Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item.id, item.book_id)}
                    loading={removeMutation.isPending && removeMutation.variables?.itemId === item.id}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  )
}
