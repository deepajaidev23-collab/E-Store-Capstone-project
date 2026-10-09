/**
 * WalletFields — wallet payment display.
 * No user input required — shows mock balance and amount to deduct.
 */
import { Text } from '@/components/ui'
import { formatPrice } from '@/lib/pricing'
import { MOCK_WALLET_BALANCE } from '@/lib/paymentSimulator'

interface WalletFieldsProps {
  amount: number
  disabled?: boolean
}

export function WalletFields({ amount }: WalletFieldsProps) {
  const remaining = MOCK_WALLET_BALANCE - amount

  return (
    <div className="flex flex-col gap-3">
      <dl className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <dt><Text size="sm" muted>Wallet Balance</Text></dt>
          <dd>
            <Text size="sm" className="font-semibold text-[var(--color-success)]">
              {formatPrice(MOCK_WALLET_BALANCE)}
            </Text>
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt><Text size="sm" muted>Amount to Deduct</Text></dt>
          <dd>
            <Text size="sm" className="font-medium">
              {formatPrice(amount)}
            </Text>
          </dd>
        </div>
        <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
          <dt><Text size="sm" muted>Balance After Payment</Text></dt>
          <dd>
            <Text size="sm" className="font-medium">
              {formatPrice(Math.max(0, remaining))}
            </Text>
          </dd>
        </div>
      </dl>
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[var(--color-success)]" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <Text size="xs" muted>Sufficient balance available</Text>
      </div>
    </div>
  )
}
