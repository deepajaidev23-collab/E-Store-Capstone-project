/**
 * Auth flow tests — Phase 7
 *
 * All tests mock useAuth so no Supabase network calls are made.
 * Covers:
 *  - AuthGuard: redirect when unauthenticated, render children when authenticated,
 *    spinner while loading
 *  - AuthRedirect: redirect authenticated users away from login/register,
 *    render children for guests
 *  - LoginPage: error Alert when signIn returns an error
 *  - RegisterPage: "Check your email" state when session is null
 *  - safeRedirectPath utility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from '@/components/AuthGuard'
import { AuthRedirect } from '@/components/AuthRedirect'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { safeRedirectPath } from '@/lib/auth'
import type { AuthContextValue } from '@/context/AuthContext'

// ── Mock useAuth ──────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth')
import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

function mockAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderWithRouter(ui: React.ReactElement, { initialEntries = ['/'] } = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── safeRedirectPath ──────────────────────────────────────────────────────────

describe('safeRedirectPath', () => {
  it('returns "/" for null', () => {
    expect(safeRedirectPath(null)).toBe('/')
  })

  it('returns "/" for undefined', () => {
    expect(safeRedirectPath(undefined)).toBe('/')
  })

  it('returns "/" for empty string', () => {
    expect(safeRedirectPath('')).toBe('/')
  })

  it('returns the path unchanged for a valid relative path', () => {
    expect(safeRedirectPath('/books/book-001')).toBe('/books/book-001')
    expect(safeRedirectPath('/cart')).toBe('/cart')
  })

  it('returns "/" for an absolute URL (open redirect attack)', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/')
    expect(safeRedirectPath('http://evil.com/login')).toBe('/')
  })

  it('returns "/" for a protocol-relative URL', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/')
  })
})

// ── AuthGuard ─────────────────────────────────────────────────────────────────

describe('AuthGuard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders children when the user is authenticated', () => {
    mockUseAuth.mockReturnValue(mockAuth({ user: { id: 'u1', email: 'a@b.com' } as never }))
    renderWithRouter(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    )
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('renders a loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue(mockAuth({ loading: true }))
    renderWithRouter(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>,
    )
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    // LoadingState renders role="status"
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects to /login?next=<path> when unauthenticated', () => {
    mockUseAuth.mockReturnValue(mockAuth({ user: null }))
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route
            path="/cart"
            element={
              <AuthGuard>
                <p>Cart</p>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})

// ── AuthRedirect ──────────────────────────────────────────────────────────────

describe('AuthRedirect', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders children when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue(mockAuth({ user: null }))
    renderWithRouter(
      <AuthRedirect>
        <p>Login form</p>
      </AuthRedirect>,
      { initialEntries: ['/login'] },
    )
    expect(screen.getByText('Login form')).toBeInTheDocument()
  })

  it('renders loading state while auth resolves', () => {
    mockUseAuth.mockReturnValue(mockAuth({ loading: true }))
    renderWithRouter(
      <AuthRedirect>
        <p>Login form</p>
      </AuthRedirect>,
    )
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects authenticated users away from /login', () => {
    mockUseAuth.mockReturnValue(mockAuth({ user: { id: 'u1' } as never }))
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthRedirect>
                <p>Login form</p>
              </AuthRedirect>
            }
          />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })
})

// ── LoginPage ─────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows an error Alert when signIn returns an error', async () => {
    mockUseAuth.mockReturnValue(
      mockAuth({
        signIn: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } }),
      }),
    )

    renderWithRouter(<LoginPage />, { initialEntries: ['/login'] })

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@email.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('renders email and password fields', () => {
    mockUseAuth.mockReturnValue(mockAuth())
    renderWithRouter(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })
})

// ── RegisterPage ──────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the "Check your email" confirmation when session is null after signUp', async () => {
    mockUseAuth.mockReturnValue(
      mockAuth({
        signUp: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: null,
        }),
      }),
    )

    renderWithRouter(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input#password' }), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      expect(screen.getByText(/confirmation link/i)).toBeInTheDocument()
    })
  })

  it('shows an error Alert when signUp returns an error', async () => {
    mockUseAuth.mockReturnValue(
      mockAuth({
        signUp: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: 'User already registered' },
        }),
      }),
    )

    renderWithRouter(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'existing@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password/i, { selector: 'input#password' }), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument()
    })
  })

  it('renders display name, email, password, and confirm password fields', () => {
    mockUseAuth.mockReturnValue(mockAuth())
    renderWithRouter(<RegisterPage />)
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i, { selector: 'input#password' })).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('shows validation error when display name is empty', async () => {
    mockUseAuth.mockReturnValue(mockAuth())
    renderWithRouter(<RegisterPage />)

    // Submit without filling display name
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument()
    })
  })
})
