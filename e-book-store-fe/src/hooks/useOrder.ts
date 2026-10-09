/**
 * useOrder — React Query hooks for order creation, retrieval, and payment.
 *
 * Query keys:
 *   ['order', orderId]  → Order | null
 *
 * createOrder:
 *   On success — clears the user's cart (best-effort; failure is logged but
 *   does not block the confirmation flow) and invalidates the cart query so
 *   the Navbar badge updates immediately.
 *
 * confirmPayment:
 *   Accepts an optional idempotencyKey to prevent double-charges on retry.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderRepository, cartRepository } from '@/repositories'
import type { CreateOrderPayload } from '@/repositories/OrderRepository'
import type { PaymentMethod } from '@/types/order'
import { cartKeys } from './useCart'

// ── Query keys ────────────────────────────────────────────────────────────────

export const orderKeys = {
  list:   (userId: string) => ['orders', userId] as const,
  detail: (orderId: string) => ['order', orderId] as const,
}

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useOrders(userId: string) {
  return useQuery({
    queryKey: orderKeys.list(userId),
    queryFn: () => orderRepository.getOrders(userId),
    enabled: !!userId,
  })
}

export function useOrder(orderId: string, userId: string, refetchIntervalMs?: number) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => orderRepository.getOrder(orderId, userId),
    enabled: !!orderId && !!userId,
    refetchInterval: refetchIntervalMs,
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

interface CreateOrderVariables {
  userId: string
  payload: CreateOrderPayload
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, payload }: CreateOrderVariables) =>
      orderRepository.createOrder(userId, payload),

    onSuccess: async (_order, { userId }) => {
      // Cart clear is best-effort; order is already created successfully.
      try {
        await cartRepository.clearCart(userId)
      } catch (e) {
        console.error('clearCart failed after order creation', e)
      }
      // Always invalidate so the UI reflects the emptied cart regardless
      void queryClient.invalidateQueries({ queryKey: cartKeys.list(userId) })
    },
  })
}

interface ConfirmPaymentVariables {
  orderId: string
  userId: string
  method: PaymentMethod
  amount: number
  simulatedOutcome?: 'success' | 'failure'
  idempotencyKey?: string
}

export function useConfirmPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, userId, method, amount, simulatedOutcome, idempotencyKey }: ConfirmPaymentVariables) =>
      orderRepository.confirmPayment(orderId, userId, method, amount, simulatedOutcome, idempotencyKey),

    onSuccess: (_payment, { orderId }) => {
      // Refresh the order so status shows 'confirmed' (set by the DB trigger)
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}

interface CancelOrderVariables {
  orderId: string
  userId: string
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, userId }: CancelOrderVariables) =>
      orderRepository.cancelOrder(orderId, userId),

    onSuccess: (_data, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
  })
}
