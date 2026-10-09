/**
 * errors.test.ts — Unit tests for the repository error taxonomy.
 *
 * Tests:
 *  - RepositoryError base class
 *  - RepositoryError.fromPostgrest() smart mapping
 *  - RepositoryError.fromUnknown() smart mapping
 *  - Each sub-class: name, code, retryable flag
 *  - Type guard helpers
 */

import { describe, it, expect } from 'vitest'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  RepositoryError,
  UnauthenticatedError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ValidationError,
  NetworkError,
  RateLimitError,
  PG_CODES,
  toUserErrorMessage,
  isRepositoryError,
  isConflictError,
  isNotFoundError,
  isNetworkError,
  isUnauthenticatedError,
  isAuthorizationError,
} from '@/repositories/supabase/errors'

// ── Helper ────────────────────────────────────────────────────────────────────

function postgrestError(overrides: Partial<PostgrestError> = {}): PostgrestError {
  return {
    message: 'error',
    details: '',
    hint: '',
    code: 'UNKNOWN',
    ...overrides,
  } as PostgrestError
}

// ── RepositoryError (base) ────────────────────────────────────────────────────

describe('RepositoryError', () => {
  it('sets name, message, code, hint, and retryable defaults', () => {
    const err = new RepositoryError('something failed')
    expect(err.name).toBe('RepositoryError')
    expect(err.message).toBe('something failed')
    expect(err.code).toBe('UNKNOWN')
    expect(err.hint).toBeNull()
    expect(err.retryable).toBe(false)
  })

  it('accepts explicit code, hint, and retryable values', () => {
    const err = new RepositoryError('msg', 'MY_CODE', 'try again', true)
    expect(err.code).toBe('MY_CODE')
    expect(err.hint).toBe('try again')
    expect(err.retryable).toBe(true)
  })

  it('is an instance of Error', () => {
    expect(new RepositoryError('x')).toBeInstanceOf(Error)
  })
})

// ── RepositoryError.fromPostgrest() ──────────────────────────────────────────

describe('RepositoryError.fromPostgrest()', () => {
  it('maps UNIQUE_VIOLATION (23505) to ConflictError', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: PG_CODES.UNIQUE_VIOLATION, message: 'duplicate key' }),
    )
    expect(err).toBeInstanceOf(ConflictError)
    expect(err.code).toBe(PG_CODES.UNIQUE_VIOLATION)
    expect(err.retryable).toBe(false)
  })

  it('maps FOREIGN_KEY_VIOLATION (23503) to ValidationError', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: PG_CODES.FOREIGN_KEY_VIOLATION, message: 'fk violation' }),
    )
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.code).toBe(PG_CODES.FOREIGN_KEY_VIOLATION)
  })

  it('maps NOT_NULL_VIOLATION (23502) to ValidationError', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: PG_CODES.NOT_NULL_VIOLATION, message: 'null' }),
    )
    expect(err).toBeInstanceOf(ValidationError)
  })

  it('maps CHECK_VIOLATION (23514) to ValidationError', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: PG_CODES.CHECK_VIOLATION, message: 'check' }),
    )
    expect(err).toBeInstanceOf(ValidationError)
  })

  it('maps PGRST116 to NotFoundError', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: PG_CODES.PGRST_NOT_FOUND, message: 'no rows' }),
    )
    expect(err).toBeInstanceOf(NotFoundError)
    expect(err.code).toBe(PG_CODES.PGRST_NOT_FOUND)
  })

  it('maps JWT-related error message to UnauthenticatedError', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: 'UNKNOWN', message: 'JWT expired' }),
    )
    expect(err).toBeInstanceOf(UnauthenticatedError)
  })

  it('maps anon-related error message to UnauthenticatedError', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: 'UNKNOWN', message: 'user is anon' }),
    )
    expect(err).toBeInstanceOf(UnauthenticatedError)
  })

  it('falls back to base RepositoryError for unknown codes', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: '99999', message: 'unknown error' }),
    )
    expect(err.constructor).toBe(RepositoryError)
    expect(err.code).toBe('99999')
  })

  it('preserves the hint from the original error', () => {
    const err = RepositoryError.fromPostgrest(
      postgrestError({ code: PG_CODES.UNIQUE_VIOLATION, message: 'dup', hint: 'check the table' }),
    )
    expect(err.hint).toBe('check the table')
  })
})

// ── RepositoryError.fromUnknown() ─────────────────────────────────────────────

describe('RepositoryError.fromUnknown()', () => {
  it('returns the same RepositoryError if already one', () => {
    const original = new ConflictError('dup')
    expect(RepositoryError.fromUnknown(original)).toBe(original)
  })

  it('wraps a fetch TypeError in NetworkError', () => {
    const err = RepositoryError.fromUnknown(new TypeError('Failed to fetch'))
    expect(err).toBeInstanceOf(NetworkError)
    expect(err.retryable).toBe(true)
  })

  it('wraps a generic Error in base RepositoryError', () => {
    const err = RepositoryError.fromUnknown(new Error('something'))
    expect(err.constructor).toBe(RepositoryError)
    expect(err.message).toBe('something')
  })

  it('wraps a string in base RepositoryError', () => {
    const err = RepositoryError.fromUnknown('oops')
    expect(err.constructor).toBe(RepositoryError)
    expect(err.message).toBe('oops')
  })
})

// ── Sub-class invariants ──────────────────────────────────────────────────────

describe('UnauthenticatedError', () => {
  it('has correct name and code', () => {
    const e = new UnauthenticatedError()
    expect(e.name).toBe('UnauthenticatedError')
    expect(e.code).toBe('UNAUTHENTICATED')
    expect(e.retryable).toBe(false)
  })
})

describe('AuthorizationError', () => {
  it('has correct name and code', () => {
    const e = new AuthorizationError()
    expect(e.name).toBe('AuthorizationError')
    expect(e.code).toBe('AUTHORIZATION_DENIED')
    expect(e.retryable).toBe(false)
  })

  it('accepts a custom message', () => {
    const e = new AuthorizationError('admins only')
    expect(e.message).toBe('admins only')
  })
})

describe('NotFoundError', () => {
  it('has correct name, code, and retryable flag', () => {
    const e = new NotFoundError()
    expect(e.name).toBe('NotFoundError')
    expect(e.code).toBe(PG_CODES.PGRST_NOT_FOUND)
    expect(e.retryable).toBe(false)
  })
})

describe('ConflictError', () => {
  it('has correct name, code, and retryable flag', () => {
    const e = new ConflictError()
    expect(e.name).toBe('ConflictError')
    expect(e.code).toBe(PG_CODES.UNIQUE_VIOLATION)
    expect(e.retryable).toBe(false)
  })
})

describe('ValidationError', () => {
  it('has correct name and retryable flag', () => {
    const e = new ValidationError('bad value')
    expect(e.name).toBe('ValidationError')
    expect(e.retryable).toBe(false)
  })

  it('defaults code to VALIDATION_ERROR', () => {
    const e = new ValidationError('msg')
    expect(e.code).toBe('VALIDATION_ERROR')
  })

  it('accepts explicit PG code', () => {
    const e = new ValidationError('msg', PG_CODES.NOT_NULL_VIOLATION)
    expect(e.code).toBe(PG_CODES.NOT_NULL_VIOLATION)
  })
})

describe('NetworkError', () => {
  it('is retryable', () => {
    const e = new NetworkError()
    expect(e.retryable).toBe(true)
    expect(e.name).toBe('NetworkError')
    expect(e.code).toBe('NETWORK_ERROR')
  })
})

describe('RateLimitError', () => {
  it('is retryable', () => {
    const e = new RateLimitError()
    expect(e.retryable).toBe(true)
    expect(e.name).toBe('RateLimitError')
    expect(e.code).toBe('RATE_LIMIT')
  })
})

// ── Type guards ───────────────────────────────────────────────────────────────

describe('Type guards', () => {
  it('isRepositoryError returns true for any subclass', () => {
    expect(isRepositoryError(new ConflictError())).toBe(true)
    expect(isRepositoryError(new NetworkError())).toBe(true)
    expect(isRepositoryError(new Error('plain'))).toBe(false)
    expect(isRepositoryError('string')).toBe(false)
  })

  it('isConflictError is specific to ConflictError', () => {
    expect(isConflictError(new ConflictError())).toBe(true)
    expect(isConflictError(new NotFoundError())).toBe(false)
  })

  it('isNotFoundError is specific to NotFoundError', () => {
    expect(isNotFoundError(new NotFoundError())).toBe(true)
    expect(isNotFoundError(new ConflictError())).toBe(false)
  })

  it('isNetworkError is specific to NetworkError', () => {
    expect(isNetworkError(new NetworkError())).toBe(true)
    expect(isNetworkError(new RateLimitError())).toBe(false)
  })

  it('isUnauthenticatedError is specific to UnauthenticatedError', () => {
    expect(isUnauthenticatedError(new UnauthenticatedError())).toBe(true)
    expect(isUnauthenticatedError(new AuthorizationError())).toBe(false)
  })

  it('isAuthorizationError is specific to AuthorizationError', () => {
    expect(isAuthorizationError(new AuthorizationError())).toBe(true)
    expect(isAuthorizationError(new UnauthenticatedError())).toBe(false)
  })

  it('all guards return false for null / undefined', () => {
    expect(isRepositoryError(null)).toBe(false)
    expect(isConflictError(undefined)).toBe(false)
    expect(isNetworkError(null)).toBe(false)
  })
})

describe('toUserErrorMessage', () => {
  it('returns clean message for UnauthenticatedError', () => {
    expect(toUserErrorMessage(new UnauthenticatedError())).toBe('You must be signed in to perform this action.')
  })

  it('returns clean message for ConflictError', () => {
    expect(toUserErrorMessage(new ConflictError())).toBe('This record already exists.')
  })

  it('returns clean message for NotFoundError', () => {
    expect(toUserErrorMessage(new NotFoundError())).toBe('The requested resource could not be found.')
  })

  it('returns clean message for NetworkError', () => {
    expect(toUserErrorMessage(new NetworkError())).toBe('Network connection issue. Please check your connection and try again.')
  })

  it('sanitizes raw internal DB errors with default message', () => {
    const rawDbError = new RepositoryError('ERROR: relation "secret_db" does not exist (SQLSTATE 42P01)')
    expect(toUserErrorMessage(rawDbError)).toBe('An unexpected error occurred. Please try again.')
  })
})
