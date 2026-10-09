/**
 * OrderDetailPage — /orders/:orderId
 *
 * Shows the full receipt for a single order: items, price breakdown,
 * shipping address, and status. Reads orderId from URL params.
 */
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useOrder } from '@/hooks/useOrder'
import { formatPrice, formatPriceDecimal } from '@/lib/pricing'
import {
  Heading,
  Text,
  Button,
  Breadcrumbs,
  Skeleton,
  ErrorState,
  NotFoundState,
} from '@/components/ui'
import type { Order, OrderItem, OrderStatus } from '@/types/order'

// ── Status badge (same palette as OrdersPage) ─────────────────────────────────

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   'bg-[var(--color-warning-subtle,#fef9c3)]  text-[var(--color-warning,#854d0e)]',
  confirmed: 'bg-[var(--color-info-subtle,#e0f2fe)]    text-[var(--color-info,#075985)]',
  shipped:   'bg-[var(--color-info-subtle,#e0f2fe)]    text-[var(--color-info,#075985)]',
  delivered: 'bg-[var(--color-success-subtle,#dcfce7)] text-[var(--color-success,#166534)]',
  cancelled: 'bg-[var(--color-bg-elevated)]            text-[var(--color-text-muted)]',
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={[
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        STATUS_STYLES[status],
      ].join(' ')}
    >
      {status}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OrderDetailPage() {
  usePageTitle('Order Detail')
  const { orderId = '' } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const { data: order, isLoading, isError, refetch } = useOrder(orderId, userId)

  const breadcrumbs = [
    { label: 'My Orders', href: '/orders' },
    { label: isLoading ? 'Loading…' : order ? `#${order.id.slice(0, 8).toUpperCase()}` : 'Not found' },
  ]

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Skeleton width="16rem" height="1rem" />
        <Skeleton width="10rem" height="1.75rem" />
        <Skeleton width="100%" height="12rem" />
        <Skeleton width="100%" height="8rem" />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorState
          title="Could not load order"
          message="Something went wrong loading this order. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <NotFoundState onGoHome={() => navigate('/orders')} />
      </div>
    )
  }

  return <OrderDetailView order={order} breadcrumbs={breadcrumbs} />
}

// ── OrderDetailView ───────────────────────────────────────────────────────────

function OrderDetailView({
  order,
  breadcrumbs,
}: {
  order: Order
  breadcrumbs: { label: string; href?: string }[]
}) {
  const navigate = useNavigate()
  const { shipping_address: addr } = order

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Heading as="h1" size="h3">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </Heading>
          <Text size="sm" muted>
            Placed on{' '}
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Items */}
      <section aria-labelledby="items-heading">
        <Heading as="h2" size="h5" id="items-heading" className="mb-3">Items</Heading>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {(order.items ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-text-muted)] text-center">
              No items recorded for this order.
            </p>
          ) : (
            (order.items ?? []).map((item) => <OrderItemRow key={item.id} item={item} />)
          )}
        </div>
      </section>

      {/* Price breakdown */}
      <section aria-labelledby="breakdown-heading">
        <Heading as="h2" size="h5" id="breakdown-heading" className="mb-3">Price Breakdown</Heading>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 space-y-2">
          <PriceLine label="Subtotal" value={formatPrice(order.subtotal)} />
          {order.discount > 0 && (
            <PriceLine label="Coupon discount" value={`−${formatPrice(order.discount)}`} highlight />
          )}
          {order.reward_points_redeemed > 0 && (
            <PriceLine
              label={`Reward points (${order.reward_points_redeemed} pts)`}
              value={`−${formatPrice(order.reward_points_redeemed)}`}
              highlight
            />
          )}
          <PriceLine label="GST (12%)" value={formatPriceDecimal(order.tax)} muted />
          <PriceLine label="Delivery" value={order.delivery_charge > 0 ? formatPrice(order.delivery_charge) : 'Free'} muted />
          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <Text size="sm" className="font-bold text-[var(--color-text-primary)]">Total</Text>
            <Text size="base" className="font-bold text-[var(--color-text-primary)]">{formatPrice(order.total)}</Text>
          </div>
        </div>
      </section>

      {/* Shipping address */}
      <section aria-labelledby="address-heading">
        <Heading as="h2" size="h5" id="address-heading" className="mb-3">Shipping Address</Heading>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
          <address className="not-italic space-y-0.5 text-sm text-[var(--color-text-primary)]">
            <p className="font-semibold">{addr.first_name} {addr.last_name}</p>
            <p>{addr.address_line}</p>
            <p>{addr.city}, {addr.state} — {addr.pin}</p>
            <p>{addr.country}</p>
            <p className="text-[var(--color-text-muted)] mt-1">
              {addr.phone} · {addr.email}
            </p>
          </address>
        </div>
      </section>

      {/* Back button */}
      <div>
        <Button variant="secondary" onClick={() => navigate('/orders')}>
          ← Back to orders
        </Button>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {item.cover_url ? (
        <img
          src={item.cover_url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="w-10 h-14 object-cover rounded-[var(--radius-sm)] shrink-0 bg-[var(--color-bg-elevated)]"
        />
      ) : (
        <div className="w-10 h-14 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] shrink-0" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{item.title}</p>
        <p className="text-xs text-[var(--color-text-muted)]">Qty: {item.quantity}</p>
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-primary)] shrink-0">
        {formatPrice(item.price * item.quantity)}
      </p>
    </div>
  )
}

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
