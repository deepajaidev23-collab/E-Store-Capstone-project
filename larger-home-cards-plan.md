# Plan: Make Homepage Book Cards Larger

## Overview

The Bestsellers and New Launches sections on the homepage display cards that are too small. The root cause is a combination of two things:

1. **Too many grid columns** — `lg:grid-cols-6` on large screens forces each card into a very narrow cell (~190px wide), leaving almost no room for content.
2. **Tiny book cover** — the compact card hardcodes cover size `"sm"` (`w-14 h-[4.5rem]` = 56×72px), which looks undersized even in a wider cell.

**Confirmed decisions:**
- Grid: 4 columns on large screens (`lg:grid-cols-4`)
- Cover: upgrade to `lg` size (112×160px) in `CompactProductCard`
- Scope: cover size change applies to both homepage and catalogue page (shared component)

---

## Sub-Tasks

---

### Sub-Task 1 — Reduce homepage grid column count

**Status:** [x] done

**Intent**
Fewer columns = wider cells = visually larger cards. Dropping from `lg:grid-cols-6` to `lg:grid-cols-4` gives each card ~290px on a 1280px screen instead of ~190px.

**Expected Outcomes**
- On large screens (≥1024px): 4 cards per row instead of 6
- On medium screens (768–1023px): 3 cards per row (change from 4 → 3)
- On small screens (640–767px): 2 cards per row (no change)
- On mobile (<640px): 2 cards per row (no change)
- Cards visually appear wider and less cramped

**Todo List**
1. Open `e-book-store-fe/src/pages/HomePage.tsx`
2. In the `BookSection` component, find the grid div at line 99
3. Change the grid classes:
   - `md:grid-cols-4` → `md:grid-cols-3`
   - `lg:grid-cols-6` → `lg:grid-cols-4`

**Relevant Context**
- File: `e-book-store-fe/src/pages/HomePage.tsx`, line 99
- The `BookSection` component is local to `HomePage.tsx` (not shared with the catalogue), so this change only affects the homepage

---

### Sub-Task 2 — Increase the compact card cover size

**Status:** [x] done

**Intent**
Upgrade the `CompactProductCard` cover from `size="sm"` (56×72px) to `size="lg"` (112×160px). Because `CompactProductCard` is used by both the homepage grid and the catalogue page, this improvement applies to both.

**Expected Outcomes**
- Book cover images in compact cards are 112×160px instead of 56×72px
- Cards have a stronger visual presence on both homepage and catalogue page
- No change to the `horizontal` card variant (cart/confirmation pages)

**Todo List**
1. Open `e-book-store-fe/src/components/ui/ProductCard.tsx`
2. In `CompactProductCard`, find line 51:
   ```tsx
   <BookCover title={book.title} coverUrl={book.coverUrl} size="sm" />
   ```
3. Change `size="sm"` → `size="lg"`

**Relevant Context**
- File: `e-book-store-fe/src/components/ui/ProductCard.tsx`, line 51
- `coverSizeMap` is defined at lines 148–152; `lg` = `w-28 h-40` (112×160px)
- `CompactProductCard` is used by:
  - `e-book-store-fe/src/pages/HomePage.tsx` (homepage Bestsellers + New Launches grids)
  - `e-book-store-fe/src/components/catalogue/BookSection.tsx` (catalogue page grid and list views)

---

## Files Changed

| File | Change |
|------|--------|
| `e-book-store-fe/src/pages/HomePage.tsx` | Grid: `md:grid-cols-4 lg:grid-cols-6` → `md:grid-cols-3 lg:grid-cols-4` |
| `e-book-store-fe/src/components/ui/ProductCard.tsx` | Cover: `size="sm"` → `size="lg"` in `CompactProductCard` |
