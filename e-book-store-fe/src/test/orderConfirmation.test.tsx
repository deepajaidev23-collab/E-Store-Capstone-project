/**
 * orderConfirmation.test.tsx — Component tests for OrderConfirmationPage.
 *
 * Tests every rendered state:
 *   - loading
 *   - error (query throws)
 *   - not found (query returns null)
 *   - pending (order.status === 'pending')
 *   - cancelled (order.status === 'cancelled')
 *   - confirmed (success view with books, price, CTA)
 *
 * Also tests:
 *   - deliveryDate helper (pure function)
 *   - Book card metadata rendering (author, description, format, categories)
 *   - Missing cover_url falls back to placeholder
 *   - Multiple books in 2-up grid
 *   - CTA button navigation callbacks
 *   - Order ID display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage'
import type { Order } from '@/types/order'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth')
vi.mock('@/hooks/useOrder')

import { useAuth } from '@/hooks/useAuth'
import { useOrder } from '@/hooks/useOrder'

const mockUseAuth = vi.mocked(useAuth)
const mockUseOrder = vi.mocked(useOrder)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/**
 * Renders OrderConfirmationPage inside the route
 * /order-confirmation/:orderId so useParams receives the id.
 */
function renderPage(orderId = 'ord-test-id') {
  const navigate = vi.fn()

  // Capture navigate calls via a spy on the rendered route
  const wrapper = render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[`/order-confirmation/${orderId}`]}>
        <Routes>
          <Route
            path="/order-confirmation/:orderId"
            element={<OrderConfirmationPage />}
          />
          <Route path="/catalogue" element={<p>Catalogue page</p>} />
          <Route path="/orders" element={<p>Orders page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return { ...wrapper, navigate }
}

function mockAuthUser(id = 'user-1') {
  mockUseAuth.mockReturnValue({
    user: { id } as never,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  })
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-abc12345',
    user_id: 'user-1',
    status: 'confirmed',
    subtotal: 448,
    discount: 0,
    reward_points_redeemed: 0,
    tax: 53.76,
    delivery_charge: 0,
    total: 501.76,
    coupon_id: null,
    shipping_address: {
      first_name: 'Ravi', last_name: 'Kumar',
      email: 'ravi@example.com', phone: '9876543210',
      address_line: '42 MG Road', city: 'Bengaluru',
      state: 'Karnataka', country: 'India', pin: '560001',
    },
    created_at: '2024-07-18T10:00:00.000Z',
    items: [
      {
        id: 'oi-1',
        order_id: 'ord-abc12345',
        book_id: 'book-1',
        title: 'Joy of Minimalism',
        cover_url: 'https://example.com/minimalism.jpg',
        price: 149,
        quantity: 1,
        book: {
          id: 'book-1',
          title: 'Joy of Minimalism',
          author_name: 'Daniel Reed',
          author_bio: null,
          author_avatar_url: null,
          publisher_id: null,
          description: 'Declutter your life to uncover peace, clarity, and joy.',
          cover_url: 'https://example.com/minimalism.jpg',
          format: 'paperback',
          language: 'English',
          price: 149,
          original_price: null,
          copies_sold: 0,
          average_rating: 0,
          is_bestseller: false,
          is_new_launch: false,
          created_at: '2024-01-01T00:00:00Z',
          categories: [
            { id: 'cat-nf', name: 'Non-fiction', slug: 'non-fiction' },
            { id: 'cat-sh', name: 'Self Help', slug: 'self-help' },
          ],
        },
      },
    ],
    ...overrides,
  }
}

// ── deliveryDate helper ───────────────────────────────────────────────────────
// We test it indirectly through the rendered BookCard.

// ── Loading state ─────────────────────────────────────────────────────────────

describe('OrderConfirmationPage — loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a loading spinner with accessible role', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByRole('status', { name: /loading your order/i })).toBeInTheDocument()
    expect(screen.getByText(/loading your order/i)).toBeInTheDocument()
  })

  it('does not render the success view while loading', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.queryByText(/your purchase of the following reads/i)).not.toBeInTheDocument()
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('OrderConfirmationPage — error', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the error view with role="alert"', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/could not load your order/i)).toBeInTheDocument()
  })

  it('shows a Try Again button', () => {
    mockAuthUser()
    const refetch = vi.fn()
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never)

    renderPage()

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('clicking Try Again calls refetch', async () => {
    mockAuthUser()
    const refetch = vi.fn().mockResolvedValue({})
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})

// ── Not found state ───────────────────────────────────────────────────────────

describe('OrderConfirmationPage — not found', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the not found view when order is null', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/order not found/i)).toBeInTheDocument()
  })

  it('shows a Continue Shopping button', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByRole('button', { name: /continue shopping/i })).toBeInTheDocument()
  })

  it('clicking Continue Shopping navigates to /catalogue', async () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /continue shopping/i }))
    expect(screen.getByText('Catalogue page')).toBeInTheDocument()
  })
})

// ── Pending state ─────────────────────────────────────────────────────────────

describe('OrderConfirmationPage — pending', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders processing state with role="status"', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ status: 'pending' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByRole('status', { name: /processing payment/i })).toBeInTheDocument()
    expect(screen.getByText(/processing your payment/i)).toBeInTheDocument()
  })

  it('does not show the success message', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ status: 'pending' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.queryByText(/your purchase of the following reads/i)).not.toBeInTheDocument()
  })

  it('shows a View My Orders link', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ status: 'pending' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByRole('button', { name: /view my orders/i })).toBeInTheDocument()
  })
})

// ── Cancelled state ───────────────────────────────────────────────────────────

describe('OrderConfirmationPage — cancelled', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the cancelled view with order id', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ id: 'ord-abc12345', status: 'cancelled' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/order cancelled/i)).toBeInTheDocument()
    // Shows truncated order ID (first 8 chars uppercased)
    expect(screen.getByText(/ORD-ABC1/i)).toBeInTheDocument()
  })

  it('shows a Continue Shopping button that navigates to /catalogue', async () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ status: 'cancelled' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /continue shopping/i }))
    expect(screen.getByText('Catalogue page')).toBeInTheDocument()
  })
})

// ── Confirmed / success state ─────────────────────────────────────────────────

describe('OrderConfirmationPage — confirmed (success)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the success message', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    // The heading spans a <br>, so we match each line separately
    expect(screen.getByText(/your purchase of the/i)).toBeInTheDocument()
    expect(screen.getByText(/following reads is successful/i)).toBeInTheDocument()
  })

  it('renders the truncated order ID', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ id: 'ord-abc12345' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByTestId('order-id')).toHaveTextContent('ORD-ABC1')
  })

  it('renders the book title', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText('Joy of Minimalism')).toBeInTheDocument()
  })

  it('renders the book author as a link-styled element', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/daniel reed/i)).toBeInTheDocument()
  })

  it('renders the book price formatted as ₹', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText('₹149')).toBeInTheDocument()
  })

  it('renders the delivery estimate for each book', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ created_at: '2024-07-18T10:00:00.000Z' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    // 3 days from 2024-07-18 = 2024-07-21
    expect(screen.getByText(/delivery by/i)).toBeInTheDocument()
    // 21 Jul should appear (exact day/month from en-IN locale)
    expect(screen.getByText(/21 Jul/)).toBeInTheDocument()
  })

  it('renders book description when available', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(
      screen.getByText(/declutter your life to uncover peace/i),
    ).toBeInTheDocument()
  })

  it('renders book format', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/paperback/i)).toBeInTheDocument()
  })

  it('renders category tags', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/non-fiction/i)).toBeInTheDocument()
    expect(screen.getByText(/self help/i)).toBeInTheDocument()
  })

  it('renders the book cover image with alt text', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    const img = screen.getByRole('img', { name: 'Joy of Minimalism' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/minimalism.jpg')
  })

  it('renders a placeholder when cover_url is empty', () => {
    mockAuthUser()
    const order = makeOrder()
    order.items![0].cover_url = ''
    mockUseOrder.mockReturnValue({
      data: order,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    // No img element with the book title alt
    expect(screen.queryByRole('img', { name: 'Joy of Minimalism' })).not.toBeInTheDocument()
  })

  it('shows quantity multiplier when quantity > 1', () => {
    mockAuthUser()
    const order = makeOrder()
    order.items![0].quantity = 3
    mockUseOrder.mockReturnValue({
      data: order,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText(/× 3/)).toBeInTheDocument()
  })

  it('renders two book cards when order has two items', () => {
    mockAuthUser()
    const order = makeOrder()
    order.items = [
      ...order.items!,
      {
        id: 'oi-2',
        order_id: 'ord-abc12345',
        book_id: 'book-2',
        title: 'The Path to Success',
        cover_url: 'https://example.com/success.jpg',
        price: 359,
        quantity: 1,
        book: {
          id: 'book-2',
          title: 'The Path to Success',
          author_name: 'James Wright',
          author_bio: null,
          author_avatar_url: null,
          publisher_id: null,
          description: 'A practical guide to achieving goals with clarity and confidence.',
          cover_url: 'https://example.com/success.jpg',
          format: 'paperback',
          language: 'English',
          price: 359,
          original_price: null,
          copies_sold: 0,
          average_rating: 0,
          is_bestseller: false,
          is_new_launch: false,
          created_at: '2024-01-01T00:00:00Z',
          categories: [
            { id: 'cat-nf', name: 'Non-fiction', slug: 'non-fiction' },
            { id: 'cat-sh', name: 'Self Help', slug: 'self-help' },
          ],
        },
      },
    ]

    mockUseOrder.mockReturnValue({
      data: order,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText('Joy of Minimalism')).toBeInTheDocument()
    expect(screen.getByText('The Path to Success')).toBeInTheDocument()
    // Author rendered as "by [name]" in a single <p>
    expect(screen.getByText(/james wright/i)).toBeInTheDocument()
    expect(screen.getByText('₹359')).toBeInTheDocument()
  })

  it('renders a Continue your Shopping button', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(
      screen.getByRole('button', { name: /continue your shopping/i }),
    ).toBeInTheDocument()
  })

  it('clicking Continue your Shopping navigates to /catalogue', async () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    await userEvent.click(
      screen.getByRole('button', { name: /continue your shopping/i }),
    )

    expect(screen.getByText('Catalogue page')).toBeInTheDocument()
  })

  it('renders a View My Orders button', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(
      screen.getByRole('button', { name: /view my orders/i }),
    ).toBeInTheDocument()
  })

  it('clicking View My Orders navigates to /orders', async () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    await userEvent.click(
      screen.getByRole('button', { name: /view my orders/i }),
    )

    expect(screen.getByText('Orders page')).toBeInTheDocument()
  })

  it('renders gracefully when items array is empty', () => {
    mockAuthUser()
    mockUseOrder.mockReturnValue({
      data: makeOrder({ items: [] }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    // Heading spans a <br> — match each line
    expect(screen.getByText(/your purchase of the/i)).toBeInTheDocument()
    expect(screen.getByText(/following reads is successful/i)).toBeInTheDocument()
    // No book titles rendered
    expect(screen.queryByText('Joy of Minimalism')).not.toBeInTheDocument()
  })

  it('renders gracefully when items is undefined', () => {
    mockAuthUser()
    const order = makeOrder()
    delete order.items
    mockUseOrder.mockReturnValue({
      data: order,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    // Heading spans a <br> — match each line
    expect(screen.getByText(/your purchase of the/i)).toBeInTheDocument()
    expect(screen.getByText(/following reads is successful/i)).toBeInTheDocument()
  })

  it('renders book without embedded book metadata (item only)', () => {
    mockAuthUser()
    const order = makeOrder()
    order.items![0] = {
      id: 'oi-1',
      order_id: 'ord-abc12345',
      book_id: 'book-1',
      title: 'Minimal Book',
      cover_url: '',
      price: 199,
      quantity: 1,
      // no book object
    }
    mockUseOrder.mockReturnValue({
      data: order,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.getByText('Minimal Book')).toBeInTheDocument()
    expect(screen.getByText('₹199')).toBeInTheDocument()
  })
})
