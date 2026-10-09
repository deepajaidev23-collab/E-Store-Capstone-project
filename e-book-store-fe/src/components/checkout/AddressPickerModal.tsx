/**
 * AddressPickerModal — displays saved address cards for the user to select.
 *
 * Opens when the "Use Saved Address" checkbox is checked on CheckoutPage.
 * Selecting an address calls onSelect() and the parent fills the form.
 */
import { Modal, Text, Button, Spinner } from '@/components/ui'
import type { Address } from '@/types/user'

interface AddressPickerModalProps {
  open: boolean
  onClose: () => void
  addresses: Address[]
  onSelect: (address: Address) => void
  loading: boolean
}

export function AddressPickerModal({
  open,
  onClose,
  addresses,
  onSelect,
  loading,
}: AddressPickerModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select a saved address"
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : addresses.length === 0 ? (
        <div className="py-8 text-center">
          <Text size="sm" muted>
            No saved addresses. Fill in the form below to continue.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col gap-3 py-2">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              type="button"
              onClick={() => onSelect(addr)}
              className={[
                'w-full text-left rounded-[var(--radius-lg)] border p-4 transition-colors cursor-pointer',
                'hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-elevated)]',
                addr.is_default
                  ? 'border-[var(--color-primary)] bg-[var(--color-bg-elevated)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-surface)]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Text size="sm" className="font-medium">
                    {addr.first_name} {addr.last_name}
                  </Text>
                  <Text size="xs" muted className="mt-0.5">
                    {addr.address_line}, {addr.city}, {addr.state} – {addr.pin}
                  </Text>
                  <Text size="xs" muted>
                    {addr.phone} · {addr.email}
                  </Text>
                </div>
                {addr.is_default && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs font-semibold px-2 py-0.5">
                    Default
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-[var(--color-border)] mt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}
