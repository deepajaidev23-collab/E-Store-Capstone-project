/**
 * RewardPointsToggle — shows available reward points and allows apply/remove.
 *
 * Rule: 1 point = ₹1.
 * The parent (CheckoutPage) is responsible for clamping the value before
 * passing it down — this component only displays and triggers changes.
 *
 * Hidden when availablePoints === 0.
 */
import { Text, Button } from '@/components/ui'
import { formatPrice } from '@/lib/pricing'

interface RewardPointsToggleProps {
  availablePoints: number
  appliedPoints: number
  maxRedeemable: number
  onChange: (points: number) => void
  disabled?: boolean
}

export function RewardPointsToggle({
  availablePoints,
  appliedPoints,
  maxRedeemable,
  onChange,
  disabled = false,
}: RewardPointsToggleProps) {
  if (availablePoints <= 0) return null

  const isApplied = appliedPoints > 0

  const handleToggle = () => {
    if (isApplied) {
      onChange(0)
    } else {
      // Clamp: min(availablePoints, maxRedeemable)
      const toApply = Math.min(availablePoints, maxRedeemable)
      onChange(toApply)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Text size="sm" className="font-medium text-[var(--color-text-primary)]">
            Reward Points
          </Text>
          <Text size="xs" muted>
            You have {availablePoints} pts (worth {formatPrice(availablePoints)})
          </Text>
        </div>
        <Button
          variant={isApplied ? 'ghost' : 'secondary'}
          size="sm"
          onClick={handleToggle}
          disabled={disabled || maxRedeemable <= 0}
          aria-pressed={isApplied}
        >
          {isApplied ? 'Remove' : 'Apply'}
        </Button>
      </div>

      {isApplied && (
        <div className="flex items-center justify-between text-sm">
          <Text size="xs" muted>
            Applied
          </Text>
          <Text size="xs" className="font-medium text-[var(--color-success)]">
            −{formatPrice(appliedPoints)}
          </Text>
        </div>
      )}
    </div>
  )
}
