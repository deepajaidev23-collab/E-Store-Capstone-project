/**
 * SupabaseAddressRepository — Supabase-backed implementation of AddressRepository.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AddressRepository, CreateAddressData } from '@/repositories/AddressRepository'
import type { Address } from '@/types/user'
import { RepositoryError } from './errors'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any>

function throwOnError(error: { message: string; code?: string; hint?: string } | null): void {
  if (error) throw RepositoryError.fromPostgrest(error as import('@supabase/supabase-js').PostgrestError)
}

interface AddressRow {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line: string
  city: string
  state: string
  country: string
  pin: string
  is_default: boolean
  created_at: string
}

function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    user_id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    address_line: row.address_line,
    city: row.city,
    state: row.state,
    country: row.country,
    pin: row.pin,
    is_default: row.is_default,
  }
}

export class SupabaseAddressRepository implements AddressRepository {
  private client: AnySupabaseClient

  constructor(client: AnySupabaseClient) {
    this.client = client
  }

  async getAddresses(userId: string): Promise<Address[]> {
    const { data, error } = await this.client
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    throwOnError(error)
    return ((data ?? []) as unknown as AddressRow[]).map(mapAddress)
  }

  async createAddress(userId: string, data: CreateAddressData): Promise<Address> {
    // If new address should be default, clear existing defaults first
    if (data.is_default) {
      const { error: clearError } = await this.client
        .from('addresses')
        .update({ is_default: false } as Record<string, unknown>)
        .eq('user_id', userId)
        .eq('is_default', true)

      throwOnError(clearError)
    }

    const { data: row, error } = await this.client
      .from('addresses')
      .insert({ user_id: userId, ...data } as Record<string, unknown>)
      .select('*')
      .single()

    throwOnError(error)
    return mapAddress(row as unknown as AddressRow)
  }

  async setDefault(addressId: string, userId: string): Promise<void> {
    // Clear existing default
    const { error: clearError } = await this.client
      .from('addresses')
      .update({ is_default: false } as Record<string, unknown>)
      .eq('user_id', userId)
      .eq('is_default', true)

    throwOnError(clearError)

    // Set new default
    const { error } = await this.client
      .from('addresses')
      .update({ is_default: true } as Record<string, unknown>)
      .eq('id', addressId)
      .eq('user_id', userId)

    throwOnError(error)
  }
}
