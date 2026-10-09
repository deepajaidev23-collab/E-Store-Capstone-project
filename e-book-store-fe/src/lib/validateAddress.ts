/**
 * validateAddressForm — pure validation function for ShippingAddressSnapshot.
 * Exported standalone so it can be used and tested independently.
 */
import type { ShippingAddressSnapshot } from '@/types/order'
import type { AddressFormErrors } from '@/components/checkout'

export function validateAddressForm(
  form: Partial<ShippingAddressSnapshot>,
): AddressFormErrors {
  const errors: AddressFormErrors = {}
  const required: Array<keyof ShippingAddressSnapshot> = [
    'first_name', 'last_name', 'address_line', 'email', 'phone', 'city', 'pin', 'state', 'country',
  ]

  for (const key of required) {
    if (!form[key]?.trim()) {
      errors[key] = 'This field is required.'
    }
  }

  if (!errors.email && form.email) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(form.email)) errors.email = 'Enter a valid email address.'
  }

  if (!errors.pin && form.pin) {
    if (!/^\d{6}$/.test(form.pin)) errors.pin = 'PIN must be exactly 6 digits.'
  }

  if (!errors.phone && form.phone) {
    if (!/^\d{10}$/.test(form.phone)) errors.phone = 'Phone must be exactly 10 digits.'
  }

  return errors
}
