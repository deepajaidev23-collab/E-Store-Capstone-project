/**
 * CardFields — input fields for credit card and debit card payment.
 *
 * Layout matches the screenshot:
 *   Row 1: Card Number (full width) | Name on Card
 *   Row 2: CVV                      | Date of Expiry
 *
 * Card number auto-formats to XXXX-XXXX-XXXX-XXXX while storing raw digits.
 * No card details are ever transmitted or stored — the values are used
 * only for simulation trigger detection and are discarded after the payment attempt.
 */
import { Input, FormField } from '@/components/ui'
import type { CardPaymentFields } from '@/lib/paymentSimulator'
import type { PaymentFieldErrors } from '@/lib/validatePayment'

interface CardFieldsProps {
  value: CardPaymentFields
  onChange: (updated: CardPaymentFields) => void
  errors: PaymentFieldErrors
  disabled?: boolean
}

export function CardFields({ value, onChange, errors, disabled = false }: CardFieldsProps) {
  const handleCardNumber = (raw: string) => {
    // Strip all non-digits, cap at 16 chars
    const digits = raw.replace(/\D/g, '').slice(0, 16)
    // Format as XXXX-XXXX-XXXX-XXXX for display (store raw with dashes)
    const formatted = digits.replace(/(.{4})/g, '$1-').replace(/-$/, '')
    onChange({ ...value, card_number: formatted })
  }

  const handleExpiry = (raw: string) => {
    // Auto-insert slash: MM/YYYY
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    const formatted = digits.length > 2
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : digits
    onChange({ ...value, expiry: formatted })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Card Number + Name */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Card Number"
          htmlFor="card-number"
          error={errors.card_number}
          required
          className="col-span-2 sm:col-span-1"
        >
          <Input
            id="card-number"
            value={value.card_number}
            onChange={(e) => handleCardNumber(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={19}
            disabled={disabled}
            error={!!errors.card_number}
            autoComplete="cc-number"
          />
        </FormField>

        <FormField
          label="Name on Card"
          htmlFor="name-on-card"
          error={errors.name_on_card}
          required
          className="col-span-2 sm:col-span-1"
        >
          <Input
            id="name-on-card"
            value={value.name_on_card}
            onChange={(e) => onChange({ ...value, name_on_card: e.target.value })}
            placeholder="Name"
            disabled={disabled}
            error={!!errors.name_on_card}
            autoComplete="cc-name"
          />
        </FormField>
      </div>

      {/* Row 2: CVV + Expiry */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="CVV" htmlFor="cvv" error={errors.cvv} required>
          <Input
            id="cvv"
            value={value.cvv}
            onChange={(e) => onChange({ ...value, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
            placeholder="XXX"
            maxLength={3}
            disabled={disabled}
            error={!!errors.cvv}
            autoComplete="cc-csc"
            type="password"
          />
        </FormField>

        <FormField label="Date of Expiry" htmlFor="expiry" error={errors.expiry} required>
          <Input
            id="expiry"
            value={value.expiry}
            onChange={(e) => handleExpiry(e.target.value)}
            placeholder="MM/YYYY"
            maxLength={7}
            disabled={disabled}
            error={!!errors.expiry}
            autoComplete="cc-exp"
          />
        </FormField>
      </div>
    </div>
  )
}
