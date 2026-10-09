import { useState } from 'react'
import {
  Heading,
  Text,
  Label,
  Price,
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Checkbox,
  SearchInput,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Navbar,
  Breadcrumbs,
  SidebarNav,
  ProductCard,
  BookCover,
  StarRating,
  Modal,
  FormField,
  FormError,
  FormSection,
  CharCounter,
  Table,
  SummaryRow,
  EmptyState,
  WishlistEmpty,
  Spinner,
  LoadingState,
  Skeleton,
  ProductCardSkeleton,
  TableRowSkeleton,
  Alert,
  ErrorState,
  NotFoundState,
} from '@/components/ui'
import type { TableColumn } from '@/components/ui'

/* ─── Section wrapper ────────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {label && <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/* ─── Sample data ────────────────────────────────────────────────────────── */
const SAMPLE_BOOK = {
  id: 'book-1',
  title: 'The Joy of Minimalism',
  author: 'Daniel Reed',
  price: 149,
  format: 'Paperback',
  genres: ['Non-fiction', 'Self Help'],
  deliveryDate: 'Mon, 21 Jul',
  rating: 4,
}

type OrderRow = { id: string; title: string; date: string; amount: number; status: string }

const ORDER_ROWS: OrderRow[] = [
  { id: '#1001', title: 'The Joy of Minimalism', date: '21 Jul 2025', amount: 149, status: 'Delivered' },
  { id: '#1002', title: 'The Art of Learning', date: '18 Jul 2025', amount: 259, status: 'Processing' },
  { id: '#1003', title: 'The Midnight Hour',   date: '10 Jul 2025', amount: 299, status: 'Cancelled' },
]

const ORDER_COLUMNS: TableColumn<OrderRow>[] = [
  { key: 'id',     header: 'Order',  cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { key: 'title',  header: 'Book',   cell: (r) => r.title },
  { key: 'date',   header: 'Date',   cell: (r) => r.date },
  { key: 'amount', header: 'Amount', align: 'right',  cell: (r) => `₹${r.amount}` },
  {
    key: 'status', header: 'Status', align: 'center',
    cell: (r) => {
      const color =
        r.status === 'Delivered'  ? 'text-[var(--color-success)]' :
        r.status === 'Processing' ? 'text-[var(--color-warning)]' :
                                    'text-[var(--color-error)]'
      return <span className={`text-xs font-semibold ${color}`}>{r.status}</span>
    },
  },
]

/* ─── Page ───────────────────────────────────────────────────────────────── */
export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [reviewText, setReviewText] = useState('')

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Page header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">Design System</h1>
        <p className="text-[var(--color-text-muted)]">
          Bibliophile component library — all tokens, components and states in one place.
        </p>
      </div>

      {/* ── 1. Typography ─────────────────────────────────────────────────── */}
      <Section title="1 · Typography">
        <Row label="Headings">
          <Heading as="h1">H1 — Page Title</Heading>
        </Row>
        <Row>
          <Heading as="h2">H2 — Section Heading</Heading>
        </Row>
        <Row>
          <Heading as="h3">H3 — Sub-section</Heading>
        </Row>
        <Row>
          <Heading as="h4">H4 — Card title</Heading>
        </Row>
        <Row label="Body text">
          <Text>Base — The quick brown fox jumps over the lazy dog.</Text>
        </Row>
        <Row>
          <Text size="sm" muted>Small muted — Delivery by Mon, 21 Jul</Text>
        </Row>
        <Row>
          <Text size="xs" muted>Extra-small — Genre tags, helper text</Text>
        </Row>
        <Row label="Tag link / genre">
          <Text tag>Non-fiction</Text>
          <Text tag>Self Help</Text>
          <Text tag>Fiction</Text>
        </Row>
        <Row label="Label">
          <Label>Regular label</Label>
          <Label required>Required label</Label>
        </Row>
        <Row label="Price">
          <Price value={149} />
          <Price value={259} />
          <Price value="1,499" />
        </Row>
      </Section>

      {/* ── 2. Colors ─────────────────────────────────────────────────────── */}
      <Section title="2 · Colors">
        {[
          { label: 'bg-base',      css: 'var(--color-bg-base)',      name: '#000000' },
          { label: 'bg-surface',   css: 'var(--color-bg-surface)',   name: '#16213e' },
          { label: 'bg-elevated',  css: 'var(--color-bg-elevated)',  name: '#0f3460' },
          { label: 'bg-overlay',   css: 'var(--color-bg-overlay)',   name: '#2a2a4a' },
          { label: 'primary',      css: 'var(--color-primary)',      name: '#2563eb' },
          { label: 'success',      css: 'var(--color-success)',      name: '#22c55e' },
          { label: 'warning',      css: 'var(--color-warning)',      name: '#f59e0b' },
          { label: 'error',        css: 'var(--color-error)',        name: '#ef4444' },
          { label: 'text-primary', css: 'var(--color-text-primary)', name: '#f9fafb' },
          { label: 'text-muted',   css: 'var(--color-text-muted)',   name: '#9ca3af' },
          { label: 'text-link',    css: 'var(--color-text-link)',    name: '#60a5fa' },
        ].map((swatch) => (
          <div key={swatch.label} className="inline-flex flex-col items-center gap-1 mr-4 mb-4">
            <div
              className="w-12 h-12 rounded-[var(--radius-lg)] border border-[var(--color-border)]"
              style={{ backgroundColor: swatch.css }}
            />
            <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight">
              {swatch.label}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] font-mono">{swatch.name}</span>
          </div>
        ))}
      </Section>

      {/* ── 3. Spacing ────────────────────────────────────────────────────── */}
      <Section title="3 · Spacing">
        {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
          <div key={n} className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-[var(--color-text-muted)] w-16">space-{n}</span>
            <div
              className="bg-[var(--color-primary)] h-4 rounded-sm opacity-70"
              style={{ width: `var(--space-${n})`, minWidth: '2px' }}
            />
            <span className="text-xs text-[var(--color-text-muted)]" style={{ fontSize: '11px' }}>
              {n * 0.25}rem
            </span>
          </div>
        ))}
      </Section>

      {/* ── 4. Cards ──────────────────────────────────────────────────────── */}
      <Section title="4 · Cards">
        <Row label="Variants">
          <Card variant="default" className="w-48">
            <CardHeader><Heading as="h4" size="h6">Default card</Heading></CardHeader>
            <CardBody><Text size="sm" muted>Surface background, subtle shadow.</Text></CardBody>
            <CardFooter><Text size="xs" muted>Footer text</Text></CardFooter>
          </Card>
          <Card variant="elevated" className="w-48">
            <CardHeader><Heading as="h4" size="h6">Elevated card</Heading></CardHeader>
            <CardBody><Text size="sm" muted>Elevated background, deeper shadow.</Text></CardBody>
            <CardFooter><Text size="xs" muted>Footer text</Text></CardFooter>
          </Card>
          <Card variant="outlined" className="w-48">
            <CardHeader><Heading as="h4" size="h6">Outlined card</Heading></CardHeader>
            <CardBody><Text size="sm" muted>Transparent bg, border only.</Text></CardBody>
            <CardFooter><Text size="xs" muted>Footer text</Text></CardFooter>
          </Card>
        </Row>
        <Row label="Padding variants">
          <Card padding="sm" className="border border-[var(--color-border)]">
            <Text size="xs">Padding sm</Text>
          </Card>
          <Card padding="md" className="border border-[var(--color-border)]">
            <Text size="xs">Padding md</Text>
          </Card>
          <Card padding="lg" className="border border-[var(--color-border)]">
            <Text size="xs">Padding lg</Text>
          </Card>
        </Row>
      </Section>

      {/* ── 5. Buttons ────────────────────────────────────────────────────── */}
      <Section title="5 · Buttons">
        <Row label="Variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
        </Row>
        <Row label="Sizes">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="States">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button fullWidth>Full width</Button>
        </Row>
        <Row label="With icons">
          <Button
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            }
          >
            Add to Cart
          </Button>
          <Button
            variant="secondary"
            trailingIcon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            }
          >
            Wishlist
          </Button>
        </Row>
        <Row label="Icon buttons">
          <IconButton label="Cart" variant="ghost">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </IconButton>
          <IconButton label="Profile" variant="secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </IconButton>
          <IconButton label="Danger action" variant="danger">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </IconButton>
        </Row>
      </Section>

      {/* ── 6. Inputs ─────────────────────────────────────────────────────── */}
      <Section title="6 · Inputs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <Label htmlFor="ds-input">Text input</Label>
            <Input id="ds-input" placeholder="e.g. John Smith" />
          </div>
          <div>
            <Label htmlFor="ds-input-err">Input with error</Label>
            <Input id="ds-input-err" error placeholder="Invalid value" defaultValue="bad@" />
          </div>
          <div>
            <Label htmlFor="ds-select">Select</Label>
            <Select id="ds-select">
              <option value="">All formats</option>
              <option>Paperback</option>
              <option>Hardcover</option>
              <option>eBook</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ds-search">Search input</Label>
            <SearchInput id="ds-search" placeholder="Search you want to read here" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ds-textarea">Textarea</Label>
            <Textarea
              id="ds-textarea"
              placeholder="Leave your review…"
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 100))}
            />
            <div className="flex justify-end mt-1">
              <CharCounter current={reviewText.length} max={100} />
            </div>
          </div>
          <div>
            <Checkbox id="ds-check-1" label="Use saved address" />
          </div>
          <div>
            <Checkbox id="ds-check-2" label="Checked" defaultChecked />
          </div>
        </div>
      </Section>

      {/* ── 7. Navigation ─────────────────────────────────────────────────── */}
      <Section title="7 · Navigation">
        <Row label="Navbar (standalone preview)">
          <div className="w-full rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)]">
            <Navbar
              items={[
                { label: 'My Orders', href: '/orders' },
                { label: 'My Wishlist', href: '/wishlist' },
                { label: 'My Writers', href: '/writers' },
              ]}
              actions={
                <div className="flex items-center gap-2">
                  <IconButton label="Cart" variant="ghost">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  </IconButton>
                  <IconButton label="Profile" variant="ghost">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </IconButton>
                </div>
              }
            />
          </div>
        </Row>
        <Row label="Sidebar nav">
          <div className="w-52 bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] p-3 border border-[var(--color-border)]">
            <SidebarNav
              activeHref="/catalogue/romance"
              items={[
                { label: 'All', href: '/catalogue' },
                { label: 'Romance', href: '/catalogue/romance' },
                { label: 'Mystery', href: '/catalogue/mystery' },
                { label: 'Science Fiction', href: '/catalogue/sci-fi' },
                { label: 'Fantasy', href: '/catalogue/fantasy' },
              ]}
            />
          </div>
        </Row>
      </Section>

      {/* ── 8. Product cards ──────────────────────────────────────────────── */}
      <Section title="8 · Product Cards">
        <Row label="Compact (catalogue grid)">
          <div className="w-72 bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] p-2">
            <ProductCard book={SAMPLE_BOOK} variant="compact" />
          </div>
          <div className="w-72 bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] p-2">
            <ProductCard
              book={{ ...SAMPLE_BOOK, id: 'book-2', title: 'The Art of Focus', author: 'Arjun Patel', price: 399, genres: ['Non-fiction', 'Self Help'] }}
              variant="compact"
            />
          </div>
        </Row>
        <Row label="Horizontal (cart / confirmation)">
          <div className="w-full max-w-xl">
            <ProductCard
              book={SAMPLE_BOOK}
              variant="horizontal"
              onAddToCart={(id) => alert(`Cart: ${id}`)}
              onAddToWishlist={(id) => alert(`Wishlist: ${id}`)}
            />
          </div>
        </Row>
        <Row label="Book cover sizes">
          <BookCover title="Joy of Minimalism" size="sm" />
          <BookCover title="Joy of Minimalism" size="md" />
          <BookCover title="Joy of Minimalism" size="lg" />
        </Row>
        <Row label="Star rating">
          <StarRating value={5} />
          <StarRating value={4} />
          <StarRating value={3} />
          <StarRating value={1} />
        </Row>
      </Section>

      {/* ── 9. Modal ──────────────────────────────────────────────────────── */}
      <Section title="9 · Modal">
        <Row>
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        </Row>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Complete Payment"
          subtitle="Payable Amount: ₹580"
          size="md"
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Select a payment method to continue your purchase.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="XXXX-XXXX-XXXX-XXXX" />
              </div>
              <div>
                <Label htmlFor="card-name">Name on Card</Label>
                <Input id="card-name" placeholder="Name" />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" placeholder="XXX" />
              </div>
              <div>
                <Label htmlFor="expiry">Date of Expiry</Label>
                <Input id="expiry" placeholder="MM/YYYY" />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <Button onClick={() => setModalOpen(false)}>Pay Now</Button>
            </div>
          </div>
        </Modal>
      </Section>

      {/* ── 10. Breadcrumbs ───────────────────────────────────────────────── */}
      <Section title="10 · Breadcrumbs">
        <Row label="Basic">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Non-Fiction', href: '/catalogue/non-fiction' },
              { label: 'Self Help', href: '/catalogue/self-help' },
              { label: 'Joy of Minimalism' },
            ]}
          />
        </Row>
        <Row label="Short">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Shopping Cart' },
            ]}
          />
        </Row>
      </Section>

      {/* ── 11. Forms ─────────────────────────────────────────────────────── */}
      <Section title="11 · Forms">
        <div className="max-w-lg bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] p-6 border border-[var(--color-border)]">
          <FormSection title="Shipping Address">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" htmlFor="fn" required>
                <Input id="fn" placeholder="First Name" />
              </FormField>
              <FormField label="Last Name" htmlFor="ln" required>
                <Input id="ln" placeholder="Last Name" />
              </FormField>
              <FormField label="Email" htmlFor="em" required className="col-span-2">
                <Input id="em" type="email" placeholder="email@example.com" />
              </FormField>
              <FormField
                label="Phone"
                htmlFor="ph"
                error="Phone number is required"
                required
              >
                <Input id="ph" error placeholder="+91" />
              </FormField>
              <FormField label="City" htmlFor="city">
                <Input id="city" placeholder="City" />
              </FormField>
            </div>
          </FormSection>
          <div className="mt-4 flex justify-end">
            <Button>Save Address</Button>
          </div>
        </div>
        <Row label="FormError standalone">
          <FormError>This field is required.</FormError>
          <FormError>Invalid email address.</FormError>
        </Row>
      </Section>

      {/* ── 12. Tables ────────────────────────────────────────────────────── */}
      <Section title="12 · Tables">
        <Row label="Data table">
          <div className="w-full">
            <Table<OrderRow>
              columns={ORDER_COLUMNS}
              rows={ORDER_ROWS}
              getRowKey={(r) => r.id}
              caption="Order history"
            />
          </div>
        </Row>
        <Row label="Empty table">
          <div className="w-full">
            <Table<OrderRow>
              columns={ORDER_COLUMNS}
              rows={[]}
              getRowKey={(r) => r.id}
              emptyMessage="No orders yet."
            />
          </div>
        </Row>
        <Row label="Summary rows (checkout)">
          <div className="w-72 bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] p-4 border border-[var(--color-border)]">
            <SummaryRow label="Price (2 items)" value="₹508.00" />
            <SummaryRow label="Tax" value="₹62.00" />
            <SummaryRow label="Delivery Charges" value="Free" />
            <SummaryRow label="Discount" value="−₹100" bold />
            <div className="my-2 border-t border-[var(--color-border)]" />
            <SummaryRow label="Total Amount" value="₹470" highlighted />
          </div>
        </Row>
      </Section>

      {/* ── 13. Empty states ──────────────────────────────────────────────── */}
      <Section title="13 · Empty States">
        <Row label="Default empty">
          <div className="w-72">
            <EmptyState
              title="No books found"
              description="Try adjusting your filters or search query."
              action={<Button size="sm">Browse all</Button>}
            />
          </div>
        </Row>
        <Row label="Wishlist empty">
          <div className="w-72">
            <WishlistEmpty />
          </div>
        </Row>
        <Row label="Custom icon">
          <div className="w-72">
            <EmptyState
              icon={
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              }
              title="No reviews yet"
              description="Be the first to share your thoughts."
            />
          </div>
        </Row>
      </Section>

      {/* ── 14. Loading states ────────────────────────────────────────────── */}
      <Section title="14 · Loading States">
        <Row label="Spinner sizes">
          <Spinner size={16} />
          <Spinner size={24} />
          <Spinner size={36} />
          <Spinner size={48} />
        </Row>
        <Row label="LoadingState block">
          <div className="w-72 bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)]">
            <LoadingState message="Loading catalogue…" />
          </div>
        </Row>
        <Row label="Skeleton primitives">
          <div className="w-64 flex flex-col gap-2">
            <Skeleton width="100%" height="1rem" />
            <Skeleton width="70%"  height="0.875rem" />
            <Skeleton width="40%"  height="0.75rem" />
          </div>
        </Row>
        <Row label="ProductCard skeleton">
          <div className="w-72 bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] p-2">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </Row>
        <Row label="Table row skeletons">
          <div className="w-full overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                  {['Order', 'Book', 'Date', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left text-[var(--color-text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton columns={5} rows={3} />
              </tbody>
            </table>
          </div>
        </Row>
      </Section>

      {/* ── 15. Error states ──────────────────────────────────────────────── */}
      <Section title="15 · Error States">
        <Row label="Alert variants">
          <div className="w-full flex flex-col gap-3 max-w-lg">
            <Alert variant="error" title="Payment failed">
              Your card was declined. Please check your details and try again.
            </Alert>
            <Alert variant="warning" title="Unconfirmed email">
              Please confirm your email address to complete registration.
            </Alert>
            <Alert variant="success" title="Order placed!">
              Your purchase of 2 books was successful.
            </Alert>
            <Alert variant="info">
              Delivery estimate may vary during peak season.
            </Alert>
            <Alert variant="error" onDismiss={() => {}}>
              Dismissible error — click × to close.
            </Alert>
          </div>
        </Row>
        <Row label="Full-page error state">
          <div className="w-72">
            <ErrorState
              title="Could not load books"
              message="Check your connection and try again."
              onRetry={() => {}}
            />
          </div>
        </Row>
        <Row label="404 Not Found state">
          <div className="w-72">
            <NotFoundState onGoHome={() => {}} />
          </div>
        </Row>
      </Section>
    </div>
  )
}
