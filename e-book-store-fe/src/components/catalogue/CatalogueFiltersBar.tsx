/**
 * CatalogueFiltersBar — the horizontal toolbar with Search, Language,
 * Format, Price Range, and Sort controls.
 * Purely presentational; no URL / state logic lives here.
 */
import type { SortField } from '@/repositories/BookRepository'
import type { Publisher } from '@/types/book'
import { SearchInput, Select, Button } from '@/components/ui'

export interface FiltersBarValues {
  search: string
  language: string
  format: string
  priceMin: string
  priceMax: string
  publisherId: string
  sort: SortField
  hasActiveFilters: boolean
}

export interface FiltersBarHandlers {
  onSearch: (v: string) => void
  onLanguage: (v: string) => void
  onFormat: (v: string) => void
  onPriceMin: (v: string) => void
  onPriceMax: (v: string) => void
  onPublisher: (v: string) => void
  onSort: (v: SortField) => void
  onReset: () => void
}

interface CatalogueFiltersBarProps extends FiltersBarValues, FiltersBarHandlers {
  publishers: Publisher[]
}

export function CatalogueFiltersBar({
  search, language, format, priceMin, priceMax, publisherId, sort, hasActiveFilters,
  onSearch, onLanguage, onFormat, onPriceMin, onPriceMax, onPublisher, onSort, onReset,
  publishers,
}: CatalogueFiltersBarProps) {
  return (
    <form
      className="flex flex-wrap gap-2 items-end"
      role="search"
      aria-label="Filter books"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Search */}
      <div className="flex-1 min-w-[180px]">
        <SearchInput
          id="catalogue-search"
          aria-label="Search books by title or author"
          placeholder="Search you want to read here"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Language */}
      <div className="min-w-[110px]">
        <label htmlFor="filter-lang" className="sr-only">Language</label>
        <Select
          id="filter-lang"
          value={language}
          onChange={(e) => onLanguage(e.target.value)}
          className="h-9"
        >
          <option value="">Language — All</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="ta">Tamil</option>
          <option value="bn">Bengali</option>
        </Select>
      </div>

      {/* Format */}
      <div className="min-w-[150px]">
        <label htmlFor="filter-format" className="sr-only">Format</label>
        <Select
          id="filter-format"
          value={format}
          onChange={(e) => onFormat(e.target.value)}
          className="h-9"
        >
          <option value="">Format — All</option>
          <option value="paperback">Paperback</option>
          <option value="ebook">eBook</option>
          <option value="hardcover">Hardcover</option>
        </Select>
      </div>

      {/* Price range */}
      <div className="flex items-center gap-1 min-w-[160px]">
        <label htmlFor="filter-pmin" className="sr-only">Min price</label>
        <input
          id="filter-pmin"
          type="number"
          min="0"
          placeholder="₹ Min"
          value={priceMin}
          onChange={(e) => onPriceMin(e.target.value)}
          className={[
            'w-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-overlay)]',
            'px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
            'h-9',
          ].join(' ')}
        />
        <span className="text-xs text-[var(--color-text-muted)]">–</span>
        <label htmlFor="filter-pmax" className="sr-only">Max price</label>
        <input
          id="filter-pmax"
          type="number"
          min="0"
          placeholder="₹ Max"
          value={priceMax}
          onChange={(e) => onPriceMax(e.target.value)}
          className={[
            'w-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-overlay)]',
            'px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
            'h-9',
          ].join(' ')}
        />
      </div>

      {/* Publisher */}
      {publishers.length > 0 && (
        <div className="min-w-[150px]">
          <label htmlFor="filter-pub" className="sr-only">Publisher</label>
          <Select
            id="filter-pub"
            value={publisherId}
            onChange={(e) => onPublisher(e.target.value)}
            className="h-9"
          >
            <option value="">Publisher — All</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
      )}

      {/* Sort */}
      <div className="min-w-[150px]">
        <label htmlFor="filter-sort" className="sr-only">Sort by</label>
        <Select
          id="filter-sort"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortField)}
          className="h-9"
        >
          <option value="relevance">Sort — Relevance</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="newest">Newest</option>
        </Select>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 shrink-0">
          Clear filters
        </Button>
      )}
    </form>
  )
}
