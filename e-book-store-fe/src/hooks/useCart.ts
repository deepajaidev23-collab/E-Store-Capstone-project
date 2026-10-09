/**
 * useCart — React Query hooks for all shopping cart operations.
 *
 * Query keys:
 *   ['cart', userId]                   → CartItem[]  (full cart)
 *   ['cart', userId, 'check', bookId]  → boolean     (is this book in cart?)
 *   ['coupon', code]                   → Coupon|null (validated coupon)
 *
 * Optimistic updates:
 *   useAddToCart    — immediately adds a provisional item or increments quantity
 *   useRemoveFromCart — immediately removes the item
 *   useUpdateCartQty  — immediately updates quantity (removes if qty → 0)
 *
 * All queries are disabled when userId is empty.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cartRepository } from '@/repositories'
import type { CartItem } from '@/types/cart'

// ── Query keys ────────────────────────────────────────────────────────────────

export const cartKeys = {
  list:   (userId: string) => ['cart', userId] as const,
  check:  (userId: string, bookId: string) => ['cart', userId, 'check', bookId] as const,
  coupon: (code: string) => ['coupon', code] as const,
}

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useCart(userId: string) {
  return useQuery({
    queryKey: cartKeys.list(userId),
    queryFn: () => cartRepository.getCart(userId),
    enabled: !!userId,
  })
}

export function useIsInCart(userId: string, bookId: string) {
  return useQuery({
    queryKey: cartKeys.check(userId, bookId),
    queryFn: () => cartRepository.isInCart(userId, bookId),
    enabled: !!userId && !!bookId,
  })
}

export function useCoupon(code: string) {
  return useQuery({
    queryKey: cartKeys.coupon(code),
    queryFn: () => cartRepository.getCoupon(code),
    enabled: code.trim().length > 0,
    // Don't re-fetch in the background — coupon data is stable
    staleTime: 60_000,
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

interface AddVariables { userId: string; bookId: string }

export function useAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, bookId }: AddVariables) =>
      cartRepository.addItem(userId, bookId),

    // Optimistic update: immediately mark as in-cart + add provisional item
    onMutate: async ({ userId, bookId }: AddVariables) => {
      const listKey  = cartKeys.list(userId)
      const checkKey = cartKeys.check(userId, bookId)

      await queryClient.cancelQueries({ queryKey: listKey })
      await queryClient.cancelQueries({ queryKey: checkKey })

      const previousList  = queryClient.getQueryData<CartItem[]>(listKey)
      const previousCheck = queryClient.getQueryData<boolean>(checkKey)

      queryClient.setQueryData<boolean>(checkKey, true)

      queryClient.setQueryData<CartItem[]>(listKey, (old = []) => {
        const existing = old.find((i) => i.book_id === bookId)
        if (existing) {
          // Increment quantity optimistically
          return old.map((i) =>
            i.book_id === bookId ? { ...i, quantity: i.quantity + 1 } : i,
          )
        }
        const placeholder: CartItem = {
          id: `optimistic-${bookId}`,
          cart_id: '',
          book_id: bookId,
          quantity: 1,
        }
        return [...old, placeholder]
      })

      return { previousList, previousCheck, userId, bookId }
    },

    onError: (_err, _vars, context) => {
      if (!context) return
      const { userId, bookId, previousList, previousCheck } = context
      queryClient.setQueryData(cartKeys.list(userId), previousList)
      queryClient.setQueryData(cartKeys.check(userId, bookId), previousCheck)
    },

    onSuccess: (_data, { userId, bookId }) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.list(userId) })
      void queryClient.invalidateQueries({ queryKey: cartKeys.check(userId, bookId) })
    },
  })
}

interface RemoveVariables { itemId: string; userId: string; bookId: string }

export function useRemoveFromCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, userId }: RemoveVariables) =>
      cartRepository.removeItem(itemId, userId),

    onMutate: async ({ itemId, userId, bookId }: RemoveVariables) => {
      const listKey  = cartKeys.list(userId)
      const checkKey = cartKeys.check(userId, bookId)

      await queryClient.cancelQueries({ queryKey: listKey })
      await queryClient.cancelQueries({ queryKey: checkKey })

      const previousList  = queryClient.getQueryData<CartItem[]>(listKey)
      const previousCheck = queryClient.getQueryData<boolean>(checkKey)

      queryClient.setQueryData<boolean>(checkKey, false)
      queryClient.setQueryData<CartItem[]>(listKey, (old = []) =>
        old.filter((i) => i.id !== itemId),
      )

      return { previousList, previousCheck, userId, bookId }
    },

    onError: (_err, _vars, context) => {
      if (!context) return
      const { userId, bookId, previousList, previousCheck } = context
      queryClient.setQueryData(cartKeys.list(userId), previousList)
      queryClient.setQueryData(cartKeys.check(userId, bookId), previousCheck)
    },

    onSuccess: (_data, { userId, bookId }) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.list(userId) })
      void queryClient.invalidateQueries({ queryKey: cartKeys.check(userId, bookId) })
    },
  })
}

interface UpdateQtyVariables { itemId: string; userId: string; bookId: string; quantity: number }

export function useUpdateCartQty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, quantity }: UpdateQtyVariables) =>
      cartRepository.updateQuantity(itemId, quantity),

    onMutate: async ({ itemId, userId, bookId, quantity }: UpdateQtyVariables) => {
      const listKey  = cartKeys.list(userId)
      const checkKey = cartKeys.check(userId, bookId)

      await queryClient.cancelQueries({ queryKey: listKey })

      const previousList  = queryClient.getQueryData<CartItem[]>(listKey)
      const previousCheck = queryClient.getQueryData<boolean>(checkKey)

      if (quantity <= 0) {
        queryClient.setQueryData<boolean>(checkKey, false)
        queryClient.setQueryData<CartItem[]>(listKey, (old = []) =>
          old.filter((i) => i.id !== itemId),
        )
      } else {
        queryClient.setQueryData<CartItem[]>(listKey, (old = []) =>
          old.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        )
      }

      return { previousList, previousCheck, userId, bookId }
    },

    onError: (_err, _vars, context) => {
      if (!context) return
      const { userId, bookId, previousList, previousCheck } = context
      queryClient.setQueryData(cartKeys.list(userId), previousList)
      queryClient.setQueryData(cartKeys.check(userId, bookId), previousCheck)
    },

    onSuccess: (_data, { userId, bookId }) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.list(userId) })
      void queryClient.invalidateQueries({ queryKey: cartKeys.check(userId, bookId) })
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => cartRepository.clearCart(userId),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.list(userId) })
    },
  })
}
