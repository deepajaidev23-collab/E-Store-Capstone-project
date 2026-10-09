/**
 * OrderConfirmationPage — /order-confirmation/:orderId route.
 *
 * Shown after a successful payment. Renders a centred modal card on the same
 * decorative dark-navy background used by PaymentPage.
 *
 * ── States ────────────────────────────────────────────────────────────────────
 *   loading   → spinner overlay on the card
 *   error     → "could not load order" message with retry
 *   not found → order does not exist / belongs to another user
 *   pending   → payment still processing, auto-polls every 3 s
 *   cancelled → order was cancelled
 *   confirmed → full success view (screenshot match)
 *
 * ── Polling ────────────────────────────────────────────────────────────────────
 * POLL_INTERVAL_MS is passed to useOrder while status is pending so React Query
 * re-fetches automatically. The interval is unused once confirmed/cancelled.
 */
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrder } from '@/hooks/useOrder'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Spinner } from '@/components/ui'
import { formatPrice } from '@/lib/pricing'
import type { Order, OrderItem } from '@/types/order'

const POLL_INTERVAL_MS = 3000

// ── Delivery date helper ──────────────────────────────────────────────────────

/**
 * Returns a delivery estimate string like "Mon, 21 Jul".
 * Adds DELIVERY_DAYS calendar days to the given ISO date string.
 */
const DELIVERY_DAYS = 3

function deliveryDate(createdAt: string): string {
  const d = new Date(createdAt)
  d.setDate(d.getDate() + DELIVERY_DAYS)
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OrderConfirmationPage() {
  usePageTitle('Order Confirmed')
  const navigate = useNavigate()
  const { orderId = '' } = useParams<{ orderId: string }>()
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const { data: order, isLoading, isError, refetch } = useOrder(
    orderId,
    userId,
    POLL_INTERVAL_MS,
  )

  return (
    <ConfirmationBackground>
      <ConfirmationCard>
        {/* ── Loading ───────────────────────────────────────────────────── */}
        {isLoading && (
          <div
            role="status"
            aria-label="Loading your order"
            className="flex flex-col items-center gap-4 py-16 px-8"
          >
            <Spinner size={40} />
            <p className="text-sm text-[rgba(255,255,255,0.6)]">Loading your order…</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {!isLoading && isError && (
          <ErrorView onRetry={() => void refetch()} onGoHome={() => navigate('/orders')} />
        )}

        {/* ── Not found ─────────────────────────────────────────────────── */}
        {!isLoading && !isError && !order && (
          <NotFoundView onGoHome={() => navigate('/catalogue')} />
        )}

        {/* ── Pending ───────────────────────────────────────────────────── */}
        {!isLoading && !isError && order?.status === 'pending' && (
          <PendingView onViewOrders={() => navigate('/orders')} />
        )}

        {/* ── Cancelled ─────────────────────────────────────────────────── */}
        {!isLoading && !isError && order?.status === 'cancelled' && (
          <CancelledView
            orderId={order.id}
            onContinue={() => navigate('/catalogue')}
          />
        )}

        {/* ── Confirmed ─────────────────────────────────────────────────── */}
        {!isLoading && !isError && order?.status === 'confirmed' && (
          <SuccessView
            order={order}
            onContinueShopping={() => navigate('/catalogue')}
            onViewOrders={() => navigate('/orders')}
          />
        )}
      </ConfirmationCard>
    </ConfirmationBackground>
  )
}

// ── SuccessView ───────────────────────────────────────────────────────────────

function SuccessView({
  order,
  onContinueShopping,
  onViewOrders,
}: {
  order: Order
  onContinueShopping: () => void
  onViewOrders: () => void
}) {
  const items = order.items ?? []

  return (
    <div className="flex flex-col items-center px-6 py-8 gap-6">

      {/* Green check circle */}
      <div
        aria-hidden="true"
        className="w-14 h-14 rounded-full bg-[var(--color-success)] flex items-center justify-center shadow-lg"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Heading */}
      <p className="text-white text-base font-medium text-center leading-snug">
        Your purchase of the<br />following reads is successful
      </p>

      {/* Order identifier */}
      <p
        data-testid="order-id"
        className="text-[rgba(255,255,255,0.45)] text-xs -mt-3"
      >
        Order #{order.id.slice(0, 8).toUpperCase()}
      </p>

      {/* Book grid */}
      {items.length > 0 && (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <BookCard key={item.id} item={item} createdAt={order.created_at} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="w-full flex flex-col items-center gap-3 pt-2">
        {/* Primary: Continue your Shopping */}
        <button
          type="button"
          onClick={onContinueShopping}
          className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors px-7 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <span>Continue your Shopping</span>
          <ShoppingBagIcon />
        </button>

        {/* Secondary: View My Orders */}
        <button
          type="button"
          onClick={onViewOrders}
          className="text-sm text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] transition-colors underline underline-offset-2"
        >
          View My Orders
        </button>
      </div>
    </div>
  )
}

// ── BookCard ──────────────────────────────────────────────────────────────────

function BookCard({ item, createdAt }: { item: OrderItem; createdAt: string }) {
  const book = item.book
  const delivery = deliveryDate(createdAt)

  return (
    <div className="flex gap-3 rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.05)] p-3">
      {/* Cover */}
      <div className="shrink-0 w-16 self-start">
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-16 h-[88px] object-cover rounded-[var(--radius-md)] shadow-md"
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-16 h-[88px] rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] flex items-center justify-center"
          >
            <BookPlaceholderIcon />
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Title */}
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
          {item.title}
        </p>

        {/* Author */}
        {book?.author_name && (
          <p className="text-xs text-[var(--color-text-link)]">
            by {book.author_name}
          </p>
        )}

        {/* Description excerpt */}
        {book?.description && (
          <p className="text-xs text-[rgba(255,255,255,0.45)] leading-snug line-clamp-2 mt-0.5">
            {book.description}
          </p>
        )}

        {/* Format */}
        {book?.format && (
          <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5 capitalize">
            {book.format}
          </p>
        )}

        {/* Category tags */}
        {book?.categories && book.categories.length > 0 && (
          <p className="text-xs text-[var(--color-text-link)] mt-0.5">
            {book.categories.map((c) => c.name).join(', ')}
          </p>
        )}

        {/* Price */}
        <p className="text-sm font-bold text-white mt-1">
          {formatPrice(item.price)}
          {item.quantity > 1 && (
            <span className="text-xs font-normal text-[rgba(255,255,255,0.45)] ml-1">
              × {item.quantity}
            </span>
          )}
        </p>

        {/* Delivery estimate */}
        <p className="text-xs text-[rgba(255,255,255,0.45)]">
          Delivery by <span className="font-medium text-[rgba(255,255,255,0.65)]">{delivery}</span>
        </p>
      </div>
    </div>
  )
}

// ── Pending / Cancelled / Error / NotFound views ──────────────────────────────

function PendingView({ onViewOrders }: { onViewOrders: () => void }) {
  return (
    <div
      role="status"
      aria-label="Processing payment"
      className="flex flex-col items-center gap-5 py-14 px-8 text-center"
    >
      <Spinner size={40} />
      <p className="text-white text-base font-medium">Processing Your Payment…</p>
      <p className="text-sm text-[rgba(255,255,255,0.5)] max-w-xs">
        Your order has been placed. We are confirming your payment — this page
        will update automatically.
      </p>
      <button
        type="button"
        onClick={onViewOrders}
        className="text-sm text-[var(--color-text-link)] hover:underline"
      >
        View My Orders
      </button>
    </div>
  )
}

function CancelledView({
  orderId,
  onContinue,
}: {
  orderId: string
  onContinue: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-14 px-8 text-center">
      <div className="w-14 h-14 rounded-full bg-[rgba(239,68,68,0.15)] border border-[var(--color-error)] flex items-center justify-center">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-error)"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <p className="text-white text-base font-medium">Order Cancelled</p>
      <p className="text-sm text-[rgba(255,255,255,0.5)] max-w-xs">
        This order was cancelled. If you were charged, please contact support.
        <br />
        <span className="text-[rgba(255,255,255,0.3)] text-xs">
          Order #{orderId.slice(0, 8).toUpperCase()}
        </span>
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors px-6 py-2.5 text-sm font-semibold text-white"
      >
        Continue Shopping
      </button>
    </div>
  )
}

function ErrorView({
  onRetry,
  onGoHome,
}: {
  onRetry: () => void
  onGoHome: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-5 py-14 px-8 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-[rgba(239,68,68,0.15)] border border-[var(--color-error)] flex items-center justify-center">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-error)"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-white text-base font-medium">Could not load your order</p>
      <p className="text-sm text-[rgba(255,255,255,0.5)] max-w-xs">
        Something went wrong fetching your order details. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors px-5 py-2 text-sm font-semibold text-white"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="text-sm text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] underline transition-colors"
        >
          View Orders
        </button>
      </div>
    </div>
  )
}

function NotFoundView({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-14 px-8 text-center">
      <p className="text-5xl font-bold text-[rgba(255,255,255,0.08)] select-none leading-none">
        404
      </p>
      <p className="text-white text-base font-medium">Order not found</p>
      <p className="text-sm text-[rgba(255,255,255,0.5)] max-w-xs">
        This order does not exist or you don&apos;t have permission to view it.
      </p>
      <button
        type="button"
        onClick={onGoHome}
        className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors px-5 py-2 text-sm font-semibold text-white"
      >
        Continue Shopping
      </button>
    </div>
  )
}

// ── Layout: background + card ─────────────────────────────────────────────────

function ConfirmationBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0d1b3e]">
      <ConfirmationFloatingShapes />
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}

function ConfirmationCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] bg-[#1c2a4a] border border-[rgba(255,255,255,0.1)] shadow-2xl overflow-hidden">
      {children}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ShoppingBagIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function BookPlaceholderIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

// ── Decorative SVG background (same aesthetic as PaymentPage) ─────────────────

function ConfirmationFloatingShapes() {
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
