/**
 * PaymentPage — /payment route.
 *
 * Full-page decorative background (dark navy, floating book shapes) with a
 * centered two-panel payment card, matching the screenshot.
 *
 * ── UI States ─────────────────────────────────────────────────────────────────
 *  IDLE          — method tabs + method-specific fields, "Pay Now" button
 *  PROCESSING    — spinner overlay, 2-second simulated delay
 *  PAYMENT_FAILED — error message, "Back to Checkout" (cancels order)
 *  (SUCCESS has no distinct state — the page navigates away immediately)
 *
 * ── Guards ────────────────────────────────────────────────────────────────────
 *  • No orderId in router state → redirect /cart
 *  • Order fetch fails / not found → redirect /cart
 *
 * ── Security ──────────────────────────────────────────────────────────────────
 *  Card/UPI fields exist only in React local state for the lifetime of this page.
 *  They are consumed by simulatePayment() for trigger detection, then the
 *  component unmounts. Nothing is persisted, logged, or transmitted.
 *
 * ── Gateway abstraction ───────────────────────────────────────────────────────
 *  All simulation logic lives in paymentSimulator.ts. To integrate a real
 *  gateway, replace simulatePayment() there — this file needs no changes.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useOrder, useConfirmPayment, useCancelOrder } from '@/hooks/useOrder'
import { orderRepository } from '@/repositories'
import { simulatePayment, FAILURE_CARD_NUMBER, FAILURE_UPI_ID, PROCESSING_DELAY_MS } from '@/lib/paymentSimulator'
import { validatePaymentFields } from '@/lib/validatePayment'
import type { CardPaymentFields, UpiPaymentFields, PaymentFields } from '@/lib/paymentSimulator'
import type { PaymentFieldErrors } from '@/lib/validatePayment'
import { formatPrice } from '@/lib/pricing'
import type { PaymentMethod } from '@/types/order'
import { Text, Spinner } from '@/components/ui'
import { CardFields, UpiFields, WalletFields } from '@/components/payment'

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'idle' | 'processing' | 'failed'

interface LocationState { orderId?: string }

const METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: 'Credit Card',
  debit_card:  'Debit Card',
  upi:         'UPI',
  wallet:      'Wallet',
}

const METHODS: PaymentMethod[] = ['credit_card', 'debit_card', 'upi', 'wallet']

const EMPTY_CARD: CardPaymentFields = { card_number: '', name_on_card: '', cvv: '', expiry: '' }
const EMPTY_UPI:  UpiPaymentFields  = { upi_id: '' }

// ── Entry guard ───────────────────────────────────────────────────────────────

export function PaymentPage() {
  usePageTitle('Payment')
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const state   = (location.state ?? {}) as LocationState
  const orderId = state.orderId ?? ''

  useEffect(() => {
    if (!orderId) navigate('/cart', { replace: true })
  }, [orderId, navigate])

  if (!orderId) return null

  return <PaymentPageInner orderId={orderId} userId={user?.id ?? ''} />
}

// ── Inner component (orderId is guaranteed) ───────────────────────────────────

function PaymentPageInner({ orderId, userId }: { orderId: string; userId: string }) {
  const navigate = useNavigate()

  const { data: order, isLoading, isError } = useOrder(orderId, userId)
  const confirmMutation = useConfirmPayment()
  const cancelMutation  = useCancelOrder()

  // ── Local state ─────────────────────────────────────────────────────────────
  const [pageState,    setPageState]    = useState<PageState>('idle')
  const [failureReason, setFailureReason] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit_card')
  const [cardFields,  setCardFields]   = useState<CardPaymentFields>(EMPTY_CARD)
  const [upiFields,   setUpiFields]    = useState<UpiPaymentFields>(EMPTY_UPI)
  const [fieldErrors, setFieldErrors]  = useState<PaymentFieldErrors>({})

  // ── Idempotency key ──────────────────────────────────────────────────────────
  // Generated once per payment attempt. On retry (after failure) a new key is
  // generated so the retry is treated as a fresh attempt.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())
  const refreshIdempotencyKey = () => {
    idempotencyKeyRef.current = crypto.randomUUID()
  }

  // ── Unmount cleanup ──────────────────────────────────────────────────────────
  // If the user navigates away (browser back) before payment completes, cancel
  // the pending order so it does not remain stuck in 'pending' state.
  // We store pageState in a ref so the cleanup closure always sees the latest value.
  const pageStateRef = useRef<PageState>('idle')
  useEffect(() => {
    pageStateRef.current = pageState
  })
  useEffect(() => {
    return () => {
      // Only cancel if still in idle/processing — not if payment succeeded or
      // was already explicitly cancelled (which navigates away)
      if (pageStateRef.current === 'idle' || pageStateRef.current === 'processing') {
        orderRepository.cancelOrder(orderId, userId).catch(() => {
          // Best-effort — ignore errors on cleanup
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clear field errors when method changes
  const handleMethodChange = (m: PaymentMethod) => {
    setSelectedMethod(m)
    setFieldErrors({})
  }

  // ── Redirect if order missing after fetch ────────────────────────────────────
  useEffect(() => {
    if (!isLoading && (isError || !order)) {
      navigate('/cart', { replace: true })
    }
  }, [isLoading, isError, order, navigate])

  // ── Pay Now ──────────────────────────────────────────────────────────────────
  const handlePayNow = async () => {
    // Collect fields for selected method
    const fields: PaymentFields =
      selectedMethod === 'upi'    ? upiFields :
      selectedMethod === 'wallet' ? {}        : cardFields

    // 1. Client-side validation
    const errors = validatePaymentFields(selectedMethod, fields)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    // 2. Show processing state
    setPageState('processing')

    // 3. Simulate 2-second delay, then determine outcome
    const result = await new Promise<ReturnType<typeof simulatePayment>>((resolve) =>
      setTimeout(() => resolve(simulatePayment(selectedMethod, fields)), PROCESSING_DELAY_MS),
    )

    // 4. Persist payment record with the simulated outcome + idempotency key
    confirmMutation.mutate(
      {
        orderId,
        userId,
        method: selectedMethod,
        amount: order!.total,
        simulatedOutcome: result.outcome,
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: () => {
          if (result.outcome === 'success') {
            navigate(`/order-confirmation/${orderId}`, { replace: true })
          } else {
            // Generate a fresh idempotency key so the next attempt is distinct
            refreshIdempotencyKey()
            setFailureReason(result.reason ?? 'Payment could not be processed.')
            setPageState('failed')
          }
        },
        onError: () => {
          // Generate a fresh idempotency key so a retry is treated as new
          refreshIdempotencyKey()
          setFailureReason('An unexpected error occurred. Please try again.')
          setPageState('failed')
        },
      },
    )
  }

  // ── Cancel (back to checkout) ────────────────────────────────────────────────
  const handleCancel = () => {
    cancelMutation.mutate(
      { orderId, userId },
      {
        onSettled: () => navigate('/checkout', { replace: true }),
      },
    )
  }

  // ── Loading order ────────────────────────────────────────────────────────────
  if (isLoading || !order) {
    return (
      <PaymentBackground>
        <div className="flex flex-col items-center gap-4 py-16">
          <Spinner />
          <Text size="sm" muted>Loading payment details…</Text>
        </div>
      </PaymentBackground>
    )
  }

  // ── Processing overlay ───────────────────────────────────────────────────────
  if (pageState === 'processing') {
    return (
      <PaymentBackground>
        <PaymentPanel title="Processing Payment" amount={order.total}>
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="relative">
              <Spinner />
              <div className="absolute inset-0 animate-ping opacity-30 rounded-full bg-[var(--color-primary)]" />
            </div>
            <Text size="base" className="font-medium text-center">
              Processing your payment…
            </Text>
            <Text size="sm" muted className="text-center">
              {METHOD_LABELS[selectedMethod]} · {formatPrice(order.total)}
            </Text>
            <Text size="xs" muted className="text-center opacity-60">
              Please do not close this window
            </Text>
          </div>
        </PaymentPanel>
      </PaymentBackground>
    )
  }

  // ── Failed state ─────────────────────────────────────────────────────────────
  if (pageState === 'failed') {
    return (
      <PaymentBackground>
        <PaymentPanel title="Complete Payment" amount={order.total}>
          <div className="flex flex-col items-center gap-5 py-8">
            {/* Failure icon */}
            <div className="w-16 h-16 rounded-full bg-red-900/40 border border-[var(--color-error)] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-error)" strokeWidth="2.5"
                strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <Text size="base" className="font-bold text-[var(--color-error)] text-center">
              Payment Failed
            </Text>
            <Text size="sm" muted className="text-center max-w-xs">
              {failureReason}
            </Text>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="mt-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {cancelMutation.isPending && <Spinner />}
              Back to Checkout
            </button>
            <Text size="xs" muted className="text-center opacity-60">
              Your order will be cancelled and you can restart checkout.
            </Text>
          </div>
        </PaymentPanel>
      </PaymentBackground>
    )
  }

  // ── Idle state (method selection + fields) ───────────────────────────────────
  // 'false' in idle — extracted to avoid TS narrowing the literal away in disabled props
  const isProcessing = false
  return (
    <PaymentBackground>
      <PaymentPanel title="Complete Payment" amount={order.total}>
        <div className="flex flex-col sm:flex-row gap-0 flex-1">

          {/* Left: method tab list */}
          <div
            role="tablist"
            aria-label="Payment method"
            className="sm:w-36 shrink-0 flex sm:flex-col border-b sm:border-b-0 sm:border-r border-[rgba(255,255,255,0.12)]"
            onKeyDown={(e) => {
              const idx = METHODS.indexOf(selectedMethod)
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault()
                handleMethodChange(METHODS[(idx + 1) % METHODS.length])
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault()
                handleMethodChange(METHODS[(idx - 1 + METHODS.length) % METHODS.length])
              }
            }}
          >
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={m === selectedMethod}
                aria-controls={`payment-panel-${m}`}
                id={`payment-tab-${m}`}
                tabIndex={m === selectedMethod ? 0 : -1}
                onClick={() => handleMethodChange(m)}
                disabled={isProcessing}
                className={[
                  'px-4 py-3 text-sm font-medium text-left transition-colors',
                  'flex-1 sm:flex-none',
                  m === selectedMethod
                    ? 'text-[var(--color-primary)] bg-[rgba(37,99,235,0.15)] sm:border-r-2 sm:border-r-[var(--color-primary)] border-b-2 sm:border-b-0 border-b-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.05)]',
                ].join(' ')}
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Right: fields + pay button */}
          <div
            role="tabpanel"
            id={`payment-panel-${selectedMethod}`}
            aria-labelledby={`payment-tab-${selectedMethod}`}
            className="flex-1 p-5 flex flex-col gap-4"
          >
            {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
              <CardFields
                value={cardFields}
                onChange={setCardFields}
                errors={fieldErrors}
                disabled={isProcessing}
              />
            )}
            {selectedMethod === 'upi' && (
              <UpiFields
                value={upiFields}
                onChange={setUpiFields}
                errors={fieldErrors}
                disabled={isProcessing}
              />
            )}
            {selectedMethod === 'wallet' && (
              <WalletFields
                amount={order.total}
                disabled={isProcessing}
              />
            )}

            {/* Test hint */}
            <div className="text-xs text-[var(--color-text-muted)] opacity-60 leading-relaxed">
              {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
                <span>Simulation: use card <code className="font-mono">{FAILURE_CARD_NUMBER}</code> to trigger failure.</span>
              )}
              {selectedMethod === 'upi' && (
                <span>Simulation: use UPI ID <code className="font-mono">{FAILURE_UPI_ID}</code> to trigger failure.</span>
              )}
            </div>

            {/* Pay Now button */}
            <div className="flex justify-end mt-auto pt-2">
              <button
                type="button"
                onClick={() => void handlePayNow()}
                disabled={isProcessing || confirmMutation.isPending}
                className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
              >
                <span>Pay Now</span>
                <LockIcon />
              </button>
            </div>
          </div>
        </div>
      </PaymentPanel>
    </PaymentBackground>
  )
}

// ── Layout helpers ────────────────────────────────────────────────────────────

/**
 * Full-viewport dark navy decorative background with floating book shapes,
 * matching the screenshot aesthetic.
 */
function PaymentBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0d1b3e]">
      {/* Decorative floating shapes */}
      <FloatingShapes />
      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}

/**
 * The payment card/panel.
 * Header: "Complete Payment" left + "Payable Amount: ₹XXX" right (matching screenshot).
 */
function PaymentPanel({
  title,
  amount,
  children,
}: {
  title: string
  amount?: number
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-[#1c2a4a] border border-[rgba(255,255,255,0.1)] shadow-2xl overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <span className="text-base font-semibold text-white">{title}</span>
        {amount !== undefined && (
          <span className="text-base font-bold text-white">
            Payable Amount: {formatPrice(amount)}
          </span>
        )}
      </div>
      {/* Panel body */}
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  )
}

/** Inline SVG lock icon for Pay Now button. */
function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/**
 * Inline SVG decorative book shapes — pure SVG, no external assets.
 * Approximates the floating book/diamond shapes seen in the screenshot.
 */
function FloatingShapes() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circles */}
      <circle cx="200" cy="150" r="180" fill="#1a3a6b" opacity="0.5" />
      <circle cx="1050" cy="550" r="220" fill="#1a3a6b" opacity="0.4" />
      <circle cx="950" cy="120" r="100" fill="#2a5298" opacity="0.3" />

      {/* Floating book — top left */}
      <g transform="translate(140,80) rotate(-15)">
        <rect width="80" height="110" rx="4" fill="#c97c2e" />
        <rect x="10" y="15" width="60" height="10" rx="2" fill="#a0621e" opacity="0.6" />
        <rect x="10" y="30" width="40" height="6" rx="2" fill="#a0621e" opacity="0.4" />
        <rect x="4" y="0" width="8" height="110" rx="2" fill="#7a4a18" />
      </g>

      {/* Floating book — bottom center */}
      <g transform="translate(470,540) rotate(5)">
        <rect width="70" height="95" rx="4" fill="#1e6b8a" />
        <rect x="8" y="12" width="54" height="8" rx="2" fill="#155a75" opacity="0.6" />
        <rect x="4" y="0" width="7" height="95" rx="2" fill="#0e3f52" />
      </g>

      {/* Open book — bottom right */}
      <g transform="translate(820,580) rotate(-8)">
        <path d="M0 20 Q50 0 100 20 L100 90 Q50 70 0 90 Z" fill="#c8b08a" />
        <path d="M100 20 Q150 0 200 20 L200 90 Q150 70 100 90 Z" fill="#d4bc96" />
        <line x1="100" y1="20" x2="100" y2="90" stroke="#a09070" strokeWidth="2" />
      </g>

      {/* Diamond shapes */}
      <rect x="680" y="60" width="18" height="18" rx="2" fill="#c97c2e" transform="rotate(45 689 69)" opacity="0.8" />
      <rect x="380" y="200" width="14" height="14" rx="1" fill="#c97c2e" transform="rotate(45 387 207)" opacity="0.6" />
      <rect x="900" y="300" width="16" height="16" rx="2" fill="#c97c2e" transform="rotate(45 908 308)" opacity="0.7" />
      <rect x="1100" y="180" width="12" height="12" rx="1" fill="#c97c2e" transform="rotate(45 1106 186)" opacity="0.5" />
      <rect x="100" y="450" width="14" height="14" rx="1" fill="#c97c2e" transform="rotate(45 107 457)" opacity="0.5" />

      {/* Wavy lines */}
      <path d="M300 400 Q350 380 400 400 Q450 420 500 400" stroke="#c8a060" strokeWidth="2" opacity="0.4" />
      <path d="M700 500 Q750 480 800 500 Q850 520 900 500" stroke="#c8a060" strokeWidth="2" opacity="0.3" />

      {/* Teal rectangle decorations */}
      <rect x="1020" y="50" width="60" height="180" rx="8" fill="#1a8a7a" opacity="0.5" />
      <circle cx="1080" cy="90" r="25" fill="#1a8a7a" opacity="0.4" />
    </svg>
  )
}
