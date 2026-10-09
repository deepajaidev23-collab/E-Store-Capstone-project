/**
 * useAddresses — React Query hooks for user delivery address operations.
 *
 * Query keys:
 *   ['addresses', userId]  → Address[]   (all saved addresses)
 *
 * All queries are disabled when userId is empty.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { addressRepository } from '@/repositories'
import type { CreateAddressData } from '@/repositories/AddressRepository'

// ── Query keys ────────────────────────────────────────────────────────────────

export const addressKeys = {
  list: (userId: string) => ['addresses', userId] as const,
}

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useAddresses(userId: string) {
  return useQuery({
    queryKey: addressKeys.list(userId),
    queryFn: () => addressRepository.getAddresses(userId),
    enabled: !!userId,
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

interface CreateAddressVariables {
  userId: string
  data: CreateAddressData
}

export function useCreateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, data }: CreateAddressVariables) =>
      addressRepository.createAddress(userId, data),
    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: addressKeys.list(userId) })
    },
  })
}

interface SetDefaultVariables {
  addressId: string
  userId: string
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ addressId, userId }: SetDefaultVariables) =>
      addressRepository.setDefault(addressId, userId),
    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: addressKeys.list(userId) })
    },
  })
}
