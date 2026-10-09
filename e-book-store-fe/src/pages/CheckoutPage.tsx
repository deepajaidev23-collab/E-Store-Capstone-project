/**
 * CheckoutPage — /checkout route.
 *
 * Single-page layout (matching the screenshot):
 *   Left column:  Read-only cart items + Address section
 *   Right column: Grand Total sidebar (coupon, reward points, Pay Now)
 *
 * State machine:
 *   mount → fetch cart + profile → empty cart → redirect to /cart
 *                                → ready → Idle
 *   Idle → Pay Now:
 *     1. validateAddress()       → errors → stay Idle
 *     2. re-validate coupon      → expired → clear + error → stay Idle
 *     3. clamp reward points
 *     4. createOrder mutation    → error → show Alert
 *                                → success → navigate('/payment', { state: { orderId } })
 *
 * Trusted pricing: calcBreakdown uses prices embedded in CartItems (fetched
 * from the DB by useCart). The OrderRepository re-calculates totals server-side
 * from the same prices — client-supplied totals are never persisted.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useProfile } from '@/hooks/useProfile'
import { useCart } from '@/hooks/useCart'
import { useAddresses } from '@/hooks/useAddresses'
import { useCreateOrder } from '@/hooks/useOrder'
import { cartRepository } from '@/repositories'
import { calcBreakdown, calcRewardPointsDiscount, formatPrice, formatPriceDecimal } from '@/lib/pricing'
import { validateAddressForm } from '@/lib/validateAddress'
import { validateCartItems } from '@/lib/validateCartItems'
import { toUserErrorMessage } from '@/repositories/supabase/errors'
import type { CartValidationError } from '@/lib/validateCartItems'
import type { ShippingAddressSnapshot } from '@/types/order'
import type { Coupon } from '@/types/cart'
import type { Address } from '@/types/user'
import {
  Heading, Text, Button, Input, Checkbox,
  ProductCard, ProductCardSkeleton, ErrorState,
  CartEmpty, Alert,
} from '@/components/ui'
import { AddressForm, AddressPickerModal, RewardPointsToggle } from '@/components/checkout'
import type { AddressFormErrors } from '@/components/checkout'

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_FORM: Partial<ShippingAddressSnapshot> = {
  first_name: '', last_name: '', address_line: '', email: '',
  phone: '', city: '', pin: '', state: '', country: 'India',
}

function mapAddressToForm(addr: Address): Partial<ShippingAddressSnapshot> {
  return {
    first_name: addr.first_name, last_name: addr.last_name,
    address_line: addr.address_line, email: addr.email,
    phone: addr.phone, city: addr.city, pin: addr.pin,
    state: addr.state, country: addr.country,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CheckoutPage() {
  usePageTitle('Checkout')
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? ''

  // ── Server state ────────────────────────────────────────────────────────────
  const { data: items = [], isLoading: cartLoading, isError: cartError, refetch: refetchCart } = useCart(userId)
  const { data: profile } = useProfile()
  const { data: addresses = [], isLoading: addressesLoading } = useAddresses(userId)
  const createOrderMutation = useCreateOrder()

  // ── Cart change detection ───────────────────────────────────────────────────
  // Compare item count at mount vs. after fetch settles. If different, warn.
  const initialItemCountRef = useRef<number | null>(null)
  const [cartChanged, setCartChanged] = useState(false)

  useEffect(() => {
    if (cartLoading || items.length === 0) return
    if (initialItemCountRef.current === null) {
      initialItemCountRef.current = items.reduce((n, i) => n + i.quantity, 0)
    } else {
      const current = items.reduce((n, i) => n + i.quantity, 0)
      if (current !== initialItemCountRef.current) {
        setCartChanged(true)
        initialItemCountRef.current = current
      }
    }
  }, [items, cartLoading])

  // ── Address form state ──────────────────────────────────────────────────────
  // selectedAddressId: ID of the saved address currently filling the form (null = manual entry)
  // On first load, default to the user's default saved address if available.
  const defaultAddressId = addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  // Lazily apply the default: if we haven't selected anything yet and addresses loaded, use the default
  const effectiveAddressId = selectedAddressId === null ? defaultAddressId : selectedAddressId
  const useSavedAddress = effectiveAddressId !== null && effectiveAddressId !== 'manual'

  // Derived: compute the form values — either from the selected saved address or from manual input
  const [manualForm, setManualForm] = useState<Partial<ShippingAddressSnapshot>>(EMPTY_FORM)
  const addressForm: Partial<ShippingAddressSnapshot> = useMemo(() => {
    if (!useSavedAddress) return manualForm
    const saved = addresses.find((a) => a.id === effectiveAddressId)
    return saved ? mapAddressToForm(saved) : manualForm
  }, [useSavedAddress, effectiveAddressId, addresses, manualForm])

  const [addressErrors, setAddressErrors] = useState<AddressFormErrors>({})
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleSavedAddressCheckbox = (checked: boolean) => {
    if (checked) {
      // Use default address if available, otherwise open picker
      if (defaultAddressId) {
        setSelectedAddressId(defaultAddressId)
      } else {
        setSelectedAddressId(defaultAddressId)
        setPickerOpen(true)
      }
    } else {
      setSelectedAddressId('manual')
      setManualForm(EMPTY_FORM)
      setAddressErrors({})
    }
  }

  const handleAddressSelect = (addr: Address) => {
    setSelectedAddressId(addr.id)
    setAddressErrors({})
    setPickerOpen(false)
  }

  // ── Coupon state ────────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

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
  }

  // ── Reward points state ─────────────────────────────────────────────────────
  const availablePoints = profile?.reward_points ?? 0
  const [appliedPoints, setAppliedPoints] = useState(0)

  // ── Pricing ─────────────────────────────────────────────────────────────────
  // Compute maxRedeemable first using unclamped appliedPoints so we don't need
  // a separate useEffect to clamp — just use effectivePoints in breakdown.
  const breakdown = calcBreakdown(items, appliedCoupon, appliedPoints)
  const maxRedeemable = calcRewardPointsDiscount(availablePoints, breakdown.discountedSubtotal)
  // Effective points is always clamped — no side effect needed
  const effectivePoints = Math.min(appliedPoints, maxRedeemable)
  // If the breakdown was computed with a value that differs from effective, recompute
  const finalBreakdown = effectivePoints !== appliedPoints
    ? calcBreakdown(items, appliedCoupon, effectivePoints)
    : breakdown

  // ── Submit error / cart validation errors ───────────────────────────────────
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [cartErrors, setCartErrors] = useState<CartValidationError[]>([])

  // ── Pay Now handler ─────────────────────────────────────────────────────────
  const handlePayNow = async () => {
    setSubmitError(null)
    setCartErrors([])

    // 1. Validate address
    const errors = validateAddressForm(addressForm)
    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors)
      return
    }

    // 2. Re-validate coupon server-side (it may have expired since page load)
    if (appliedCoupon) {
      try {
        const fresh = await cartRepository.getCoupon(appliedCoupon.code)
        if (!fresh) {
          setAppliedCoupon(null)
          setCouponInput('')
          setCouponError('Your coupon has expired or been deactivated. Please review and try again.')
          return
        }
        // Use the freshly validated coupon
        setAppliedCoupon(fresh)
      } catch {
        setCouponError('Could not re-validate coupon. Please try again.')
        return
      }
    }

    // 3. Clamp reward points (defensive — should already be clamped reactively)
    const safePoints = effectivePoints

    // 4. Pre-flight: re-fetch cart to get the very latest book data, then
    //    validate. This catches deleted or invalid books before order creation.
    const { data: freshItems = [] } = await refetchCart()
    const validationErrors = validateCartItems(freshItems)
    if (validationErrors.length > 0) {
      setCartErrors(validationErrors)
      return
    }

    // 5. Build trusted order payload from fresh cart items (prices from DB)
    const orderItems = freshItems
      .filter((i) => !!i.book)
      .map((i) => ({
        book_id: i.book_id,
        title: i.book!.title,
        cover_url: i.book!.cover_url,
        price: i.book!.price,   // price fetched from DB — never trust client value
        quantity: i.quantity,
      }))

    const address = addressForm as ShippingAddressSnapshot

    // 5. Create order
    try {
      const order = await new Promise<{ id: string }>((resolve, reject) => {
        createOrderMutation.mutate(
          {
            userId,
            payload: {
              address,
              coupon: appliedCoupon,
              rewardPointsRedeemed: safePoints,
              items: orderItems,
            },
          },
          {
            onSuccess: (o) => resolve(o),
            onError: (err) => reject(err),
          },
        )
      })

      navigate('/payment', { state: { orderId: order.id } })
    } catch (err) {
      setSubmitError(
        toUserErrorMessage(err, 'Order creation failed. Please try again.'),
      )
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (cartLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-8 w-48 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] animate-pulse mb-6" />
        <div className="flex flex-col gap-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (cartError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <ErrorState
          title="Could not load checkout"
          message="Something went wrong loading your cart. Please try again."
          onRetry={() => refetchCart()}
        />
      </div>
    )
  }

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (!cartLoading && items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" className="mb-6">Checkout</Heading>
        <CartEmpty onBrowse={() => navigate('/catalogue')} />
      </div>
    )
  }

  const isSubmitting = createOrderMutation.isPending

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Heading as="h1" className="mb-6">Shopping Cart</Heading>

      {/* Cart changed warning */}
      {cartChanged && (
        <Alert variant="warning" className="mb-4" onDismiss={() => setCartChanged(false)}>
          Your cart was updated. Please review your items before continuing.
        </Alert>
      )}

      {/* Submit error */}
      {submitError && (
        <Alert variant="error" className="mb-4" onDismiss={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {/* Cart validation errors — shown when a book is missing or invalid */}
      {cartErrors.length > 0 && (
        <Alert variant="error" className="mb-4" onDismiss={() => setCartErrors([])}>
          <div className="flex flex-col gap-1">
            <span className="font-medium">Some items in your cart cannot be ordered:</span>
            {cartErrors.map((e) => (
              <span key={e.book_id} className="text-sm">• {e.message}</span>
            ))}
            <button
              type="button"
              className="mt-1 text-sm underline text-left hover:opacity-80"
              onClick={() => navigate('/cart')}
            >
              Go to Cart to fix issues
            </button>
          </div>
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* Read-only cart items */}
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              if (!item.book) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
                  >
                    <Text size="sm" muted>Book unavailable — will be skipped</Text>
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
                  className="rounded-[var(--radius-xl)] border border-[var(--color-border)] overflow-hidden"
                >
                  <ProductCard book={cardBook} variant="horizontal" />
                  <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)]">
                    <Text size="xs" muted>Qty: {item.quantity}</Text>
                    <Text size="sm" className="font-medium">
                      {formatPrice(item.book.price * item.quantity)}
                    </Text>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Address section */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
            <Heading as="h2" className="mb-4">Address</Heading>

            {/* Saved address checkbox */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
              <Checkbox
                checked={useSavedAddress}
                onChange={(e) => handleSavedAddressCheckbox(e.target.checked)}
                disabled={isSubmitting}
              />
              <Text size="sm">Use Saved Address</Text>
            </label>

            {/* If using saved address, show selected address summary + Change button */}
            {useSavedAddress && addressForm.first_name && (
              <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--color-primary)] bg-[var(--color-bg-elevated)] p-3 flex items-start justify-between gap-2">
                <div>
                  <Text size="sm" className="font-medium">
                    {addressForm.first_name} {addressForm.last_name}
                  </Text>
                  <Text size="xs" muted>
                    {addressForm.address_line}, {addressForm.city}, {addressForm.state} – {addressForm.pin}
                  </Text>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
                  Change
                </Button>
              </div>
            )}

            <AddressForm
              value={addressForm}
              onChange={(updated) => {
                setManualForm(updated)
                setAddressErrors({})
              }}
              errors={addressErrors}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* ── Right column (sticky) ────────────────────────────────────────── */}
        <div className="lg:w-80 shrink-0">
          <div className="sticky top-20 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 flex flex-col gap-4">
            <Heading as="h2">Grand Total</Heading>

            {/* Coupon input */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-bg-elevated)] px-3 py-2">
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
                  <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} disabled={isSubmitting}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="checkout-coupon-input"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value)
                      setCouponError(null)
                    }}
                    placeholder="Apply Coupon"
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleApplyCoupon() }}
                    className="flex-1"
                    disabled={isSubmitting}
                    aria-describedby={couponError ? 'checkout-coupon-error' : undefined}
                    aria-invalid={!!couponError}
                    aria-label="Coupon code"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleApplyCoupon()}
                    loading={couponLoading}
                    disabled={isSubmitting}
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && (
                <p id="checkout-coupon-error" role="alert" className="mt-1 text-xs text-[var(--color-error)]">
                  {couponError}
                </p>
              )}
            </div>

            {/* Price breakdown */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
              <PriceLine label={`Price (${finalBreakdown.itemCount} item${finalBreakdown.itemCount !== 1 ? 's' : ''})`} value={formatPrice(finalBreakdown.subtotal)} />
              <PriceLine label="Tax" value={formatPriceDecimal(finalBreakdown.tax)} muted />
              <PriceLine label="Delivery Charges" value="Free" muted />
              {finalBreakdown.discount > 0 && (
                <PriceLine label="Discount" value={`−${formatPrice(finalBreakdown.discount)}`} highlight />
              )}
              {finalBreakdown.rewardPointsDiscount > 0 && (
                <PriceLine label="Reward Points" value={`−${formatPrice(finalBreakdown.rewardPointsDiscount)}`} highlight />
              )}
            </div>

            {/* Reward points toggle */}
            <RewardPointsToggle
              availablePoints={availablePoints}
              appliedPoints={effectivePoints}
              maxRedeemable={maxRedeemable}
              onChange={setAppliedPoints}
              disabled={isSubmitting}
            />

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
              <Text size="sm" className="font-bold text-[var(--color-text-primary)]">
                Total Amount
              </Text>
              <Text size="lg" className="font-bold text-[var(--color-text-primary)]">
                {formatPrice(finalBreakdown.total)}
              </Text>
            </div>

            {/* Pay Now */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => void handlePayNow()}
              loading={isSubmitting}
              disabled={isSubmitting}
              icon={<LockIcon />}
            >
              Pay Now
            </Button>
          </div>
        </div>
      </div>

      {/* Address picker modal */}
      <AddressPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        addresses={addresses}
        onSelect={handleAddressSelect}
        loading={addressesLoading}
      />
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function PriceLine({
  label, value, highlight = false, muted = false,
}: {
  label: string; value: string; highlight?: boolean; muted?: boolean
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
          highlight ? 'font-medium text-[var(--color-success)]'
            : muted ? 'text-[var(--color-text-muted)]'
              : 'text-[var(--color-text-primary)]'
        }
      >
        {value}
      </Text>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
