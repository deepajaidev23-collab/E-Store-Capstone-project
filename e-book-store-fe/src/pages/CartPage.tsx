/**
 * CartPage — /cart route.
 *
 * Features:
 *  - Lists cart items with quantity controls (− / +)
 *  - Remove individual item (optimistic)
 *  - Coupon code input + validation
 *  - Price breakdown panel (subtotal, discount, tax, total)
 *  - "Proceed to Checkout" CTA
 *  - Empty, loading, and error states
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  useCart,
  useRemoveFromCart,
  useUpdateCartQty,
  useClearCart,
} from '@/hooks/useCart'
import { cartRepository } from '@/repositories'
import { calcBreakdown, formatPrice, formatPriceDecimal } from '@/lib/pricing'
import { toUserErrorMessage } from '@/repositories/supabase/errors'
import type { Coupon } from '@/types/cart'
import {
  Heading,
  Text,
  Button,
  Input,
  ProductCard,
  CartEmpty,
  ErrorState,
  ProductCardSkeleton,
  Alert,
} from '@/components/ui'

export function CartPage() {
  usePageTitle('Shopping Cart')
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const { data: items = [], isLoading, isError, refetch } = useCart(userId)
  const removeMutation   = useRemoveFromCart()
  const updateQtyMutation = useUpdateCartQty()
  const clearMutation    = useClearCart()

  // ── Coupon state ───────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  // ── Screen reader live region for cart mutations ───────────────────────────
  const [cartStatusMessage, setCartStatusMessage] = useState('')

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const coupon = await cartRepository.getCoupon(code)
      if (!coupon) {
        setCouponError('Invalid or expired coupon code.')
        setAppliedCoupon(null)
      } else {
        setAppliedCoupon(coupon)
        setCouponError(null)
        const discount = coupon.discount_type === 'flat'
          ? `−₹${coupon.discount_value}`
          : `${coupon.discount_value}% off`
        setCartStatusMessage(`Coupon applied — ${discount}`)
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
    setCartStatusMessage('Coupon removed')
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
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
      <div className="mx-auto max-w-5xl px-4 py-8">
        <ErrorState
          title="Could not load cart"
          message="Something went wrong. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" className="mb-6">Shopping Cart</Heading>
        <CartEmpty onBrowse={() => navigate('/catalogue')} />
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRemove = (itemId: string, bookId: string) => {
    removeMutation.mutate({ itemId, userId, bookId })
    setCartStatusMessage('Item removed from cart')
  }

  const handleQtyChange = (itemId: string, bookId: string, qty: number) => {
    updateQtyMutation.mutate({ itemId, userId, bookId, quantity: qty })
    setCartStatusMessage('Quantity updated')
  }

  const handleClearAll = () => {
    clearMutation.mutate(userId)
    setCartStatusMessage('Cart cleared')
  }

  // ── Price breakdown ────────────────────────────────────────────────────────
  const breakdown = calcBreakdown(items, appliedCoupon)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Screen reader live region for cart mutations */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {cartStatusMessage}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Heading as="h1">Shopping Cart</Heading>
          <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs font-semibold px-2 py-0.5 min-w-[1.5rem]">
            {breakdown.itemCount}
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
      {(removeMutation.isError || updateQtyMutation.isError || clearMutation.isError) && (
        <Alert variant="error" className="mb-4" onDismiss={() => {
          removeMutation.reset()
          updateQtyMutation.reset()
          clearMutation.reset()
        }}>
          {toUserErrorMessage(
            removeMutation.error || updateQtyMutation.error || clearMutation.error,
            'An action failed. Please try again.',
          )}
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Cart items list ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {items.map((item) => {
            if (!item.book) {
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

                {/* Quantity + remove row */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]">
                  {/* Quantity stepper */}
                  <div className="flex items-center gap-2">
                    <Text size="xs" muted>Qty:</Text>
                    <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="px-3 py-1 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-40"
                        disabled={updateQtyMutation.isPending}
                        onClick={() => handleQtyChange(item.id, item.book_id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="px-3 py-1 text-sm font-medium text-[var(--color-text-primary)] border-x border-[var(--color-border)] select-none min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="px-3 py-1 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-40"
                        disabled={updateQtyMutation.isPending}
                        onClick={() => handleQtyChange(item.id, item.book_id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <Text size="xs" muted>
                      {formatPrice(item.book.price * item.quantity)}
                    </Text>
                  </div>

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
            )
          })}
        </div>

        {/* ── Order summary panel ────────────────────────────────────────── */}
        <div className="lg:w-80 shrink-0">
          <div className="sticky top-20 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 flex flex-col gap-4">
            <Heading as="h2">Order Summary</Heading>

            {/* Coupon input */}
            <div>
              <Text size="sm" muted className="mb-1.5">Apply Coupon</Text>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-subtle)] px-3 py-2">
                  <div>
                    <Text size="sm" className="font-medium text-[var(--color-success)]">
                      {appliedCoupon.code}
                    </Text>
                    <Text size="xs" muted>
                      {appliedCoupon.discount_type === 'flat'
                        ? `−₹${appliedCoupon.discount_value}`
                        : `${appliedCoupon.discount_value}% off`}
                    </Text>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="cart-coupon-input"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value)
                      setCouponError(null)
                    }}
                    placeholder="Enter coupon code"
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleApplyCoupon() }}
                    className="flex-1"
                    aria-describedby={couponError ? 'cart-coupon-error' : undefined}
                    aria-invalid={!!couponError}
                    aria-label="Coupon code"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleApplyCoupon()}
                    loading={couponLoading}
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && (
                <p id="cart-coupon-error" role="alert" className="mt-1 text-xs text-[var(--color-error)]">
                  {couponError}
                </p>
              )}
            </div>

            {/* Breakdown lines */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
              <PriceLine label="Subtotal" value={formatPrice(breakdown.subtotal)} />
              {breakdown.discount > 0 && (
                <PriceLine
                  label="Discount"
                  value={`−${formatPrice(breakdown.discount)}`}
                  highlight
                />
              )}
              <PriceLine
                label="Tax (GST 12%)"
                value={formatPriceDecimal(breakdown.tax)}
                muted
              />
              <PriceLine label="Delivery" value="Free" muted />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
              <Text size="sm" className="font-bold text-[var(--color-text-primary)]">
                Total Amount
              </Text>
              <Text size="lg" className="font-bold text-[var(--color-text-primary)]">
                {formatPrice(breakdown.total)}
              </Text>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate('/checkout')}
              icon={<CheckoutIcon />}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small helper components ────────────────────────────────────────────────────

function PriceLine({
  label,
  value,
  highlight = false,
  muted = false,
}: {
  label: string
  value: string
  highlight?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <Text
        size="sm"
        className={muted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}
      >
        {label}
      </Text>
      <Text
        size="sm"
        className={
          highlight
            ? 'font-medium text-[var(--color-success)]'
            : muted
              ? 'text-[var(--color-text-muted)]'
              : 'text-[var(--color-text-primary)]'
        }
      >
        {value}
      </Text>
    </div>
  )
}

function CheckoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
