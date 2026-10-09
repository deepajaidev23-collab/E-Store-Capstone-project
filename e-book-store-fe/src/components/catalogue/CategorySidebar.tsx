/**
 * CategorySidebar — vertical list of categories with "All" at top.
 * Purely presentational; receives data + callback from parent.
 */
import type { Category } from '@/types/book'

interface CategorySidebarProps {
  categories: Category[]
  activeSlug: string
  onSelect: (slug: string) => void
}

export function CategorySidebar({ categories, activeSlug, onSelect }: CategorySidebarProps) {
  return (
    <nav aria-label="Browse by category" className="w-full">
      <ul className="flex flex-col gap-0.5 list-none m-0 p-0" role="list">
        {categories.map((cat) => {
          const active = cat.slug === activeSlug || (activeSlug === '' && cat.slug === 'all')
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onSelect(cat.slug)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors cursor-pointer',
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-overlay)] hover:text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {cat.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
