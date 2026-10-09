/**
 * AddressRepository — contract for user delivery address operations.
 *
 * Auth-gated: every method requires an authenticated user.
 */
import type { Address } from '@/types/user'

export type CreateAddressData = Omit<Address, 'id' | 'user_id' | 'created_at'>

export interface AddressRepository {
  /**
   * All saved addresses for the given user, newest-first.
   */
  getAddresses(userId: string): Promise<Address[]>

  /**
   * Create a new address for the user.
   * If `data.is_default` is true the implementation must clear any existing
   * default first (the DB partial-unique index prevents two defaults).
   */
  createAddress(userId: string, data: CreateAddressData): Promise<Address>

  /**
   * Mark an address as the default (clears any existing default first).
   */
  setDefault(addressId: string, userId: string): Promise<void>
}
