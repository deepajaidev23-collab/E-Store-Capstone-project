/**
 * OrdersPage — /orders
 *
 * Lists all orders for the authenticated user, newest first.
 * Each row links to the order detail page.
 */
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useOrders } from '@/hooks/useOrder'
import { formatPrice } from '@/lib/pricing'
import {
  Heading,
  Table,
  EmptyState,
  ErrorState,
  Skeleton,
  TableRowSkeleton,
} from '@/components/ui'
import type { TableColumn } from '@/components/ui'
import type { Order, OrderStatus } from '@/types/order'

// ── Status badge ──────────────────────────────────────────────────────────────

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

// ── Columns ───────────────────────────────────────────────────────────────────

const COLUMNS: TableColumn<Order>[] = [
  {
    key: 'id',
    header: 'Order',
    cell: (o) => (
      <span className="font-mono text-xs text-[var(--color-text-muted)]">
        #{o.id.slice(0, 8).toUpperCase()}
      </span>
    ),
    width: '140px',
  },
  {
    key: 'date',
    header: 'Date',
    cell: (o) =>
      new Date(o.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  },
  {
    key: 'items',
    header: 'Items',
    align: 'center',
    cell: (o) => (o.items?.length ?? '—'),
    width: '80px',
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    cell: (o) => <span className="font-medium">{formatPrice(o.total)}</span>,
    width: '100px',
  },
  {
    key: 'status',
    header: 'Status',
    align: 'center',
    cell: (o) => <StatusBadge status={o.status} />,
    width: '120px',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export function OrdersPage() {
  usePageTitle('My Orders')
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const { data: orders = [], isLoading, isError, refetch } = useOrders(userId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Header */}
      {isLoading ? (
        <Skeleton width="10rem" height="1.75rem" />
      ) : (
        <div className="flex items-center gap-3">
          <Heading as="h1" size="h3">My Orders</Heading>
          {orders.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs font-semibold px-2 py-0.5 min-w-[1.5rem]">
              {orders.length}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {isError && (
        <ErrorState
          title="Could not load orders"
          message="Something went wrong. Please try again."
          onRetry={() => void refetch()}
        />
      )}

      {/* Loading skeleton */}
      {isLoading && !isError && (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)]">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <TableRowSkeleton columns={5} rows={4} />
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && orders.length === 0 && (
        <EmptyState
          title="No orders yet"
          description="When you place an order it will appear here."
          action={
            <button
              onClick={() => navigate('/catalogue')}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Browse books
            </button>
          }
        />
      )}

      {/* Orders table */}
      {!isLoading && !isError && orders.length > 0 && (
        <Table<Order>
          caption="Your order history"
          columns={COLUMNS}
          rows={orders}
          getRowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
        />
      )}
    </div>
  )
}
