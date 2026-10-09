/**
 * useWishlist — React Query hooks for all wishlist operations.
 *
 * Query keys:
 *   ['wishlist', userId]                      → WishlistItem[] (full list)
 *   ['wishlist', userId, 'check', bookId]     → boolean (is this book in wishlist?)
 *
 * Optimistic updates:
 *   useAddToWishlist    — immediately inserts a provisional item; rolls back on error
 *   useRemoveFromWishlist — immediately removes the item; rolls back on error
 *
 * All queries are disabled when userId is empty (before auth session hydrates).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wishlistRepository } from '@/repositories'
import type { WishlistItem } from '@/types/cart'

// ── Query keys ────────────────────────────────────────────────────────────────

export const wishlistKeys = {
  list:  (userId: string) => ['wishlist', userId] as const,
  check: (userId: string, bookId: string) => ['wishlist', userId, 'check', bookId] as const,
}

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useWishlist(userId: string) {
  return useQuery({
    queryKey: wishlistKeys.list(userId),
    queryFn: () => wishlistRepository.getWishlist(userId),
    enabled: !!userId,
  })
}

export function useIsInWishlist(userId: string, bookId: string) {
  return useQuery({
    queryKey: wishlistKeys.check(userId, bookId),
    queryFn: () => wishlistRepository.isInWishlist(userId, bookId),
    enabled: !!userId && !!bookId,
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

interface AddVariables { userId: string; bookId: string }

export function useAddToWishlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, bookId }: AddVariables) =>
      wishlistRepository.addToWishlist(userId, bookId),

    // Optimistic update: immediately mark the book as in-wishlist
    onMutate: async ({ userId, bookId }: AddVariables) => {
      const listKey  = wishlistKeys.list(userId)
      const checkKey = wishlistKeys.check(userId, bookId)

      await queryClient.cancelQueries({ queryKey: listKey })
      await queryClient.cancelQueries({ queryKey: checkKey })

      const previousList  = queryClient.getQueryData<WishlistItem[]>(listKey)
      const previousCheck = queryClient.getQueryData<boolean>(checkKey)

      // Optimistically mark as in wishlist
      queryClient.setQueryData<boolean>(checkKey, true)

      // Optimistically prepend a placeholder item (no book embed yet)
      queryClient.setQueryData<WishlistItem[]>(listKey, (old = []) => {
        const alreadyIn = old.some((i) => i.book_id === bookId)
        if (alreadyIn) return old
        const placeholder: WishlistItem = {
          id: `optimistic-${bookId}`,
          wishlist_id: '',
          book_id: bookId,
          added_at: new Date().toISOString(),
        }
        return [placeholder, ...old]
      })

      return { previousList, previousCheck, userId, bookId }
    },

    onError: (_err, _vars, context) => {
      if (!context) return
      const { userId, bookId, previousList, previousCheck } = context
      queryClient.setQueryData(wishlistKeys.list(userId), previousList)
      queryClient.setQueryData(wishlistKeys.check(userId, bookId), previousCheck)
    },

    onSuccess: (_data, { userId, bookId }) => {
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.list(userId) })
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.check(userId, bookId) })
    },
  })
}

interface RemoveVariables { itemId: string; userId: string; bookId: string }

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, userId }: RemoveVariables) =>
      wishlistRepository.removeFromWishlist(itemId, userId),

    // Optimistic update: immediately remove from list and flip boolean
    onMutate: async ({ itemId, userId, bookId }: RemoveVariables) => {
      const listKey  = wishlistKeys.list(userId)
      const checkKey = wishlistKeys.check(userId, bookId)

      await queryClient.cancelQueries({ queryKey: listKey })
      await queryClient.cancelQueries({ queryKey: checkKey })

      const previousList  = queryClient.getQueryData<WishlistItem[]>(listKey)
      const previousCheck = queryClient.getQueryData<boolean>(checkKey)

      queryClient.setQueryData<boolean>(checkKey, false)
      queryClient.setQueryData<WishlistItem[]>(listKey, (old = []) =>
        old.filter((i) => i.id !== itemId),
      )

      return { previousList, previousCheck, userId, bookId }
    },

    onError: (_err, _vars, context) => {
      if (!context) return
      const { userId, bookId, previousList, previousCheck } = context
      queryClient.setQueryData(wishlistKeys.list(userId), previousList)
      queryClient.setQueryData(wishlistKeys.check(userId, bookId), previousCheck)
    },

    onSuccess: (_data, { userId, bookId }) => {
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.list(userId) })
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.check(userId, bookId) })
    },
  })
}

export function useClearWishlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => wishlistRepository.clearWishlist(userId),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: wishlistKeys.list(userId) })
    },
  })
}
