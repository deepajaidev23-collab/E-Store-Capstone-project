/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { RouteErrorElement } from '@/components/RouteErrorElement'
import { AuthGuard } from '@/components/AuthGuard'
import { AuthRedirect } from '@/components/AuthRedirect'
import { Spinner } from '@/components/ui'

// Lazy load all route pages for optimal code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const CataloguePage = lazy(() => import('@/pages/CataloguePage').then((m) => ({ default: m.CataloguePage })))
const BookDetailPage = lazy(() => import('@/pages/BookDetailPage').then((m) => ({ default: m.BookDetailPage })))
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })))
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const PaymentPage = lazy(() => import('@/pages/PaymentPage').then((m) => ({ default: m.PaymentPage })))
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage })))
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const DesignSystemPage = lazy(() => import('@/pages/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage })))

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <Spinner size={36} aria-label="Loading page content" />
    </div>
  )
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorElement />,
    children: [
      { path: '/', element: withSuspense(HomePage) },
      { path: '/design-system', element: withSuspense(DesignSystemPage) },
      { path: '/catalogue', element: withSuspense(CataloguePage) },
      { path: '/catalogue/:categorySlug', element: withSuspense(CataloguePage) },
      { path: '/books/:bookId', element: withSuspense(BookDetailPage) },
      {
        path: '/wishlist',
        element: (
          <AuthGuard>
            {withSuspense(WishlistPage)}
          </AuthGuard>
        ),
      },
      {
        path: '/cart',
        element: (
          <AuthGuard>
            {withSuspense(CartPage)}
          </AuthGuard>
        ),
      },
      {
        path: '/checkout',
        element: (
          <AuthGuard>
            {withSuspense(CheckoutPage)}
          </AuthGuard>
        ),
      },
      {
        path: '/payment',
        element: (
          <AuthGuard>
            {withSuspense(PaymentPage)}
          </AuthGuard>
        ),
      },
      {
        path: '/order-confirmation/:orderId',
        element: (
          <AuthGuard>
            {withSuspense(OrderConfirmationPage)}
          </AuthGuard>
        ),
      },
      {
        path: '/orders',
        element: (
          <AuthGuard>
            {withSuspense(OrdersPage)}
          </AuthGuard>
        ),
      },
      {
        path: '/orders/:orderId',
        element: (
          <AuthGuard>
            {withSuspense(OrderDetailPage)}
          </AuthGuard>
        ),
      },
      {
        path: '/profile',
        element: (
          <AuthGuard>
            {withSuspense(ProfilePage)}
          </AuthGuard>
        ),
      },
      { path: '*', element: withSuspense(NotFoundPage) },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorElement />,
    children: [
      { path: '/login',    element: <AuthRedirect>{withSuspense(LoginPage)}</AuthRedirect> },
      { path: '/register', element: <AuthRedirect>{withSuspense(RegisterPage)}</AuthRedirect> },
    ],
  },
])
