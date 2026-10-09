/**
 * MockAddressRepository — in-memory implementation of AddressRepository.
 * Seed data: two addresses, one marked default.
 */
import type { AddressRepository, CreateAddressData } from '@/repositories/AddressRepository'
import type { Address } from '@/types/user'

const delay = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms))

export class MockAddressRepository implements AddressRepository {
  /** userId → Address[] */
  private store: Map<string, Address[]> = new Map()

  private getUserAddresses(userId: string): Address[] {
    if (!this.store.has(userId)) {
      // Seed two addresses for dev convenience
      this.store.set(userId, [
        {
          id: `addr-default-${userId}`,
          user_id: userId,
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          phone: '9876543210',
          address_line: '42 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          pin: '560001',
          is_default: true,
        },
        {
          id: `addr-alt-${userId}`,
          user_id: userId,
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          phone: '9876543210',
          address_line: '15 Park Street',
          city: 'Kolkata',
          state: 'West Bengal',
          country: 'India',
          pin: '700016',
          is_default: false,
        },
      ])
    }
    return this.store.get(userId)!
  }

  async getAddresses(userId: string): Promise<Address[]> {
    await delay()
    return [...this.getUserAddresses(userId)]
  }

  async createAddress(userId: string, data: CreateAddressData): Promise<Address> {
    await delay()
    const list = this.getUserAddresses(userId)

    if (data.is_default) {
      for (const a of list) a.is_default = false
    }

    const newAddress: Address = {
      id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      ...data,
    }
    list.push(newAddress)
    return newAddress
  }

  async setDefault(addressId: string, userId: string): Promise<void> {
    await delay()
    const list = this.getUserAddresses(userId)
    for (const a of list) {
      a.is_default = a.id === addressId
    }
  }
}
