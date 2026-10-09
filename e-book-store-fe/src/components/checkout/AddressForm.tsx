/**
 * AddressForm — controlled form for entering a delivery address.
 *
 * Pure presentational — no data fetching.
 * Matches the screenshot layout exactly:
 *   Row 1: First Name | Last Name | Address Line
 *   Row 2: Email | City | Pin
 *   Row 3: Phone (+91 prefix) | State | Country (default: India)
 */
import React from 'react'
import { Input, FormField } from '@/components/ui'
import type { ShippingAddressSnapshot } from '@/types/order'

export type AddressFormErrors = Partial<Record<keyof ShippingAddressSnapshot, string>>

interface AddressFormProps {
  value: Partial<ShippingAddressSnapshot>
  onChange: (updated: Partial<ShippingAddressSnapshot>) => void
  errors: AddressFormErrors
  disabled?: boolean
}

export function AddressForm({ value, onChange, errors, disabled = false }: AddressFormProps) {
  const field = (key: keyof ShippingAddressSnapshot) => ({
    value: value[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [key]: e.target.value }),
    error: !!errors[key],
    disabled,
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: First Name | Last Name | Address Line */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="First Name" htmlFor="addr-first-name" error={errors.first_name} required>
          <Input id="addr-first-name" placeholder="First Name" autoComplete="given-name" {...field('first_name')} />
        </FormField>
        <FormField label="Last Name" htmlFor="addr-last-name" error={errors.last_name} required>
          <Input id="addr-last-name" placeholder="Last Name" autoComplete="family-name" {...field('last_name')} />
        </FormField>
        <FormField label="Address" htmlFor="addr-address-line" error={errors.address_line} required>
          <Input id="addr-address-line" placeholder="Address Line 2" autoComplete="street-address" {...field('address_line')} />
        </FormField>
      </div>

      {/* Row 2: Email | City | Pin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="e-mail" htmlFor="addr-email" error={errors.email} required>
          <Input
            id="addr-email"
            type="email"
            placeholder="e-mail"
            autoComplete="email"
            {...field('email')}
          />
        </FormField>
        <FormField label="City" htmlFor="addr-city" error={errors.city} required>
          <Input id="addr-city" placeholder="City" autoComplete="address-level2" {...field('city')} />
        </FormField>
        <FormField label="Pin" htmlFor="addr-pin" error={errors.pin} required>
          <Input
            id="addr-pin"
            placeholder="000000"
            maxLength={6}
            autoComplete="postal-code"
            {...field('pin')}
          />
        </FormField>
      </div>

      {/* Row 3: Phone | State | Country */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Phone Number" htmlFor="addr-phone" error={errors.phone} required>
          <div className="flex gap-1">
            <span className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm text-[var(--color-text-muted)] select-none shrink-0">
              +91
            </span>
            <Input
              id="addr-phone"
              placeholder="12345678901"
              maxLength={10}
              className="flex-1"
              autoComplete="tel"
              {...field('phone')}
            />
          </div>
        </FormField>
        <FormField label="State" htmlFor="addr-state" error={errors.state} required>
          <Input id="addr-state" placeholder="State" autoComplete="address-level1" {...field('state')} />
        </FormField>
        <FormField label="Country" htmlFor="addr-country" error={errors.country} required>
          <Input id="addr-country" placeholder="India" autoComplete="country-name" {...field('country')} />
        </FormField>
      </div>
    </div>
  )
}
