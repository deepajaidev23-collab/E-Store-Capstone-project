/**
 * UpiFields — input field for UPI payment.
 * Single VPA/UPI-ID input (e.g. name@bank).
 */
import { Input, FormField } from '@/components/ui'
import type { UpiPaymentFields } from '@/lib/paymentSimulator'
import type { PaymentFieldErrors } from '@/lib/validatePayment'

interface UpiFieldsProps {
  value: UpiPaymentFields
  onChange: (updated: UpiPaymentFields) => void
  errors: PaymentFieldErrors
  disabled?: boolean
}

export function UpiFields({ value, onChange, errors, disabled = false }: UpiFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <FormField label="UPI ID" htmlFor="upi-id" error={errors.upi_id} required>
        <Input
          id="upi-id"
          value={value.upi_id}
          onChange={(e) => onChange({ upi_id: e.target.value })}
          placeholder="name@bank"
          disabled={disabled}
          error={!!errors.upi_id}
          autoComplete="on"
        />
      </FormField>
      <p className="text-xs text-[var(--color-text-muted)]">
        Enter your UPI Virtual Payment Address (VPA).
      </p>
    </div>
  )
}
