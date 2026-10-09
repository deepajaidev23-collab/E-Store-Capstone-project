import { useEffect } from 'react'

/**
 * Sets the document title for the current page.
 * Format: "<title> — Bibliophile"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — Bibliophile`
    return () => {
      document.title = 'Bibliophile'
    }
  }, [title])
}
