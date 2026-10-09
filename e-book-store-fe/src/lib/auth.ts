/**
 * Auth utilities shared between AuthGuard, AuthRedirect, and login/register pages.
 */

/**
 * Validates that a redirect path is safe (relative, no open-redirect to
 * external sites via a crafted ?next= parameter).
 *
 * Only accepts paths that start with "/" and do not start with "//".
 * Falls back to "/" for anything else.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next) return '/'
  if (next.startsWith('/') && !next.startsWith('//')) return next
  return '/'
}
