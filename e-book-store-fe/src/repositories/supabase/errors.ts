/**
 * Repository error taxonomy.
 *
 * Hierarchy:
 *
 *   RepositoryError            (base — wraps any Supabase/fetch failure)
 *   ├── UnauthenticatedError   (no active session)
 *   ├── AuthorizationError     (session exists but insufficient privilege – RLS / 403)
 *   ├── NotFoundError          (row or resource does not exist – PGRST116 / 404)
 *   ├── ConflictError          (unique-constraint violation – PG 23505)
 *   ├── ValidationError        (check-constraint / not-null / foreign-key – PG 23xxx)
 *   ├── NetworkError           (fetch failed, DNS, timeout — transient)
 *   └── RateLimitError         (429 Too Many Requests)
 *
 * All classes expose:
 *  - `code`      — PostgreSQL error code, HTTP status string, or domain constant.
 *  - `hint`      — optional human-readable hint from Supabase / caller.
 *  - `retryable` — whether a retry attempt makes sense for this error kind.
 */

import type { PostgrestError } from '@supabase/supabase-js'

// ── PostgreSQL error code constants ──────────────────────────────────────────

/** PostgreSQL class 23 — Integrity Constraint Violation codes. */
export const PG_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  /** PostgREST: no rows returned from a `.single()` query */
  PGRST_NOT_FOUND: 'PGRST116',
} as const

// ── Base class ────────────────────────────────────────────────────────────────

export class RepositoryError extends Error {
  readonly code: string
  readonly hint: string | null
  /** Whether retrying the same operation could succeed. */
  readonly retryable: boolean

  constructor(
    message: string,
    code = 'UNKNOWN',
    hint: string | null = null,
    retryable = false,
  ) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
    this.hint = hint
    this.retryable = retryable
  }

  /**
   * Maps a raw `PostgrestError` to the most specific subclass available,
   * falling back to a plain `RepositoryError`.
   */
  static fromPostgrest(error: PostgrestError): RepositoryError {
    const code = error.code ?? 'UNKNOWN'
    const hint = error.hint ?? null
    const msg = error.message

    switch (code) {
      case PG_CODES.UNIQUE_VIOLATION:
        return new ConflictError(msg, hint)

      case PG_CODES.FOREIGN_KEY_VIOLATION:
      case PG_CODES.NOT_NULL_VIOLATION:
      case PG_CODES.CHECK_VIOLATION:
        return new ValidationError(msg, code, hint)

      case PG_CODES.PGRST_NOT_FOUND:
        return new NotFoundError(msg, hint)

      default:
        // HTTP-level auth errors surfaced by PostgREST
        if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('anon')) {
          return new UnauthenticatedError()
        }
        return new RepositoryError(msg, code, hint)
    }
  }

  /**
   * Maps a generic `Error` (e.g. a fetch failure) to `NetworkError` when it
   * looks transient, or returns a plain `RepositoryError` otherwise.
   */
  static fromUnknown(err: unknown): RepositoryError {
    if (err instanceof RepositoryError) return err
    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      return new NetworkError(err.message)
    }
    if (err instanceof Error) {
      return new RepositoryError(err.message)
    }
    return new RepositoryError(String(err))
  }
}

// ── Sub-classes ───────────────────────────────────────────────────────────────

/** No active Supabase session. */
export class UnauthenticatedError extends RepositoryError {
  constructor(hint: string | null = null) {
    super('You must be signed in to perform this action.', 'UNAUTHENTICATED', hint, false)
    this.name = 'UnauthenticatedError'
  }
}

/**
 * Session exists but the authenticated user lacks sufficient privilege.
 * Typically caused by RLS policy rejection or a 403 from a Supabase Edge
 * Function.
 */
export class AuthorizationError extends RepositoryError {
  constructor(message = 'You do not have permission to perform this action.', hint: string | null = null) {
    super(message, 'AUTHORIZATION_DENIED', hint, false)
    this.name = 'AuthorizationError'
  }
}

/** The requested row or resource does not exist (PostgREST PGRST116 / 404). */
export class NotFoundError extends RepositoryError {
  constructor(message = 'The requested resource was not found.', hint: string | null = null) {
    super(message, PG_CODES.PGRST_NOT_FOUND, hint, false)
    this.name = 'NotFoundError'
  }
}

/**
 * A unique-constraint violation (PostgreSQL 23505).
 * Commonly occurs when a user submits a duplicate review or adds a book that
 * is already in the wishlist.
 */
export class ConflictError extends RepositoryError {
  constructor(message = 'This record already exists.', hint: string | null = null) {
    super(message, PG_CODES.UNIQUE_VIOLATION, hint, false)
    this.name = 'ConflictError'
  }
}

/**
 * A data integrity violation other than a unique conflict:
 * foreign-key (23503), not-null (23502), or check-constraint (23514).
 */
export class ValidationError extends RepositoryError {
  constructor(message: string, code = 'VALIDATION_ERROR', hint: string | null = null) {
    super(message, code, hint, false)
    this.name = 'ValidationError'
  }
}

/**
 * A transient network failure (fetch TypeError, DNS, timeout).
 * Marked retryable so callers / React Query can apply backoff.
 */
export class NetworkError extends RepositoryError {
  constructor(message = 'A network error occurred. Please check your connection.', hint: string | null = null) {
    super(message, 'NETWORK_ERROR', hint, true)
    this.name = 'NetworkError'
  }
}

/**
 * The server returned 429 Too Many Requests.
 * Marked retryable with the expectation that callers honour a back-off delay.
 */
export class RateLimitError extends RepositoryError {
  constructor(message = 'Too many requests. Please wait a moment and try again.', hint: string | null = null) {
    super(message, 'RATE_LIMIT', hint, true)
    this.name = 'RateLimitError'
  }
}

/**
 * Returns a user-friendly error message for UI display, ensuring
 * raw database error messages / SQL internals are never exposed.
 */
export function toUserErrorMessage(
  err: unknown,
  defaultMessage = 'An unexpected error occurred. Please try again.',
): string {
  if (err instanceof UnauthenticatedError) {
    return 'You must be signed in to perform this action.'
  }
  if (err instanceof AuthorizationError) {
    return 'You do not have permission to perform this action.'
  }
  if (err instanceof NotFoundError) {
    return 'The requested resource could not be found.'
  }
  if (err instanceof ConflictError) {
    return 'This record already exists.'
  }
  if (err instanceof NetworkError) {
    return 'Network connection issue. Please check your connection and try again.'
  }
  if (err instanceof RateLimitError) {
    return 'Too many requests. Please wait a moment and try again.'
  }
  if (err instanceof ValidationError) {
    return 'The submitted information was invalid. Please check your entries and try again.'
  }
  if (err instanceof RepositoryError) {
    if (err.code === PG_CODES.UNIQUE_VIOLATION) {
      return 'This record already exists.'
    }
    if (err.code === PG_CODES.PGRST_NOT_FOUND) {
      return 'The requested resource could not be found.'
    }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Network connection issue. Please check your connection and try again.'
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    if (msg.includes('unauthenticated') || msg.includes('jwt') || msg.includes('sign in')) {
      return 'You must be signed in to perform this action.'
    }
  }
  return defaultMessage
}

// ── Type guards ───────────────────────────────────────────────────────────────

export function isRepositoryError(err: unknown): err is RepositoryError {
  return err instanceof RepositoryError
}

export function isConflictError(err: unknown): err is ConflictError {
  return err instanceof ConflictError
}

export function isNotFoundError(err: unknown): err is NotFoundError {
  return err instanceof NotFoundError
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError
}

export function isUnauthenticatedError(err: unknown): err is UnauthenticatedError {
  return err instanceof UnauthenticatedError
}

export function isAuthorizationError(err: unknown): err is AuthorizationError {
  return err instanceof AuthorizationError
}
