/**
 * BookActions — Add to Cart + Add to Wishlist buttons.
 *
 * When the user is authenticated and the book is already in their wishlist,
 * the button toggles to "In Wishlist" with a filled heart icon.
 * All auth-gating and toggle logic lives in BookDetailPage — this component
 * is purely presentational.
 */
import { Button } from '@/components/ui'

interface BookActionsProps {
  onAddToCart: () => void
  onAddToWishlist: () => void
  /** True when the current book is in the user's wishlist */
  isInWishlist?: boolean
  /** True while an add/remove wishlist mutation is in-flight */
  wishlistLoading?: boolean
  /** True when the current book is already in the cart */
  isInCart?: boolean
  /** True while an add-to-cart mutation is in-flight */
  cartLoading?: boolean
  loading?: boolean
}

export function BookActions({
  onAddToCart,
  onAddToWishlist,
  isInWishlist = false,
  wishlistLoading = false,
  isInCart = false,
  cartLoading = false,
  loading = false,
}: BookActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="primary"
        size="md"
        onClick={onAddToCart}
        loading={loading || cartLoading}
        icon={isInCart ? <CartFilledIcon /> : <CartIcon />}
        aria-label={isInCart ? 'Go to cart' : 'Add to cart'}
      >
        {isInCart ? 'In Cart' : 'Add to Cart'}
      </Button>

      <Button
        variant="secondary"
        size="md"
        onClick={onAddToWishlist}
        loading={loading || wishlistLoading}
        icon={isInWishlist ? <HeartFilledIcon /> : <HeartOutlineIcon />}
        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
      </Button>
    </div>
  )
}

function CartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function CartFilledIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function HeartOutlineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function HeartFilledIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
