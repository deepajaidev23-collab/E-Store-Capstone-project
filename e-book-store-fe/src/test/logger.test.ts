/**
 * logger.test.ts — Unit tests for the structured logger utility.
 *
 * Tests:
 *  - sanitize() — PII/sensitive-key scrubbing, nested objects, arrays,
 *    circular references, and non-sensitive pass-through.
 *  - logger log-level filtering.
 *  - logger.child() context propagation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sanitize, createLogger, LOG_LEVELS } from '@/lib/logger'

// ── sanitize() ────────────────────────────────────────────────────────────────

describe('sanitize()', () => {
  it('returns primitives unchanged', () => {
    expect(sanitize('hello')).toBe('hello')
    expect(sanitize(42)).toBe(42)
    expect(sanitize(true)).toBe(true)
    expect(sanitize(null)).toBeNull()
    expect(sanitize(undefined)).toBeUndefined()
  })

  it('passes through non-sensitive keys unchanged', () => {
    const input = { userId: 'abc', bookId: 'xyz', quantity: 3 }
    expect(sanitize(input)).toEqual(input)
  })

  // ── password / secret ──────────────────────────────────────────────────────

  it('redacts "password" key', () => {
    const result = sanitize({ password: 'supersecret' }) as Record<string, unknown>
    expect(result.password).toBe('[REDACTED]')
  })

  it('redacts "passwd" key', () => {
    const result = sanitize({ passwd: 'p@ssw0rd' }) as Record<string, unknown>
    expect(result.passwd).toBe('[REDACTED]')
  })

  it('redacts "secret" key', () => {
    const result = sanitize({ secret: 'my-secret' }) as Record<string, unknown>
    expect(result.secret).toBe('[REDACTED]')
  })

  // ── tokens ─────────────────────────────────────────────────────────────────

  it('redacts "token" key', () => {
    const result = sanitize({ token: 'eyJhbGciOi...' }) as Record<string, unknown>
    expect(result.token).toBe('[REDACTED]')
  })

  it('redacts "access_token" key', () => {
    const result = sanitize({ access_token: 'tok_live_abc' }) as Record<string, unknown>
    expect(result.access_token).toBe('[REDACTED]')
  })

  it('redacts "refresh_token" key', () => {
    const result = sanitize({ refresh_token: 'ref_abc' }) as Record<string, unknown>
    expect(result.refresh_token).toBe('[REDACTED]')
  })

  it('redacts "api_key" key', () => {
    const result = sanitize({ api_key: 'sk-abc123' }) as Record<string, unknown>
    expect(result.api_key).toBe('[REDACTED]')
  })

  // ── payment details ────────────────────────────────────────────────────────

  it('redacts "card_number" key', () => {
    const result = sanitize({ card_number: '4111111111111111' }) as Record<string, unknown>
    expect(result.card_number).toBe('[REDACTED]')
  })

  it('redacts "cardNumber" (camelCase) key', () => {
    const result = sanitize({ cardNumber: '4111111111111111' }) as Record<string, unknown>
    expect(result.cardNumber).toBe('[REDACTED]')
  })

  it('redacts "cvv" key', () => {
    const result = sanitize({ cvv: '123' }) as Record<string, unknown>
    expect(result.cvv).toBe('[REDACTED]')
  })

  it('redacts "cvc" key', () => {
    const result = sanitize({ cvc: '456' }) as Record<string, unknown>
    expect(result.cvc).toBe('[REDACTED]')
  })

  it('redacts "expiry" key', () => {
    const result = sanitize({ expiry: '12/26' }) as Record<string, unknown>
    expect(result.expiry).toBe('[REDACTED]')
  })

  it('redacts "expiration" key', () => {
    const result = sanitize({ expiration: '2026-12' }) as Record<string, unknown>
    expect(result.expiration).toBe('[REDACTED]')
  })

  it('redacts "authorization" key (HTTP header)', () => {
    const result = sanitize({ authorization: 'Bearer token123' }) as Record<string, unknown>
    expect(result.authorization).toBe('[REDACTED]')
  })

  // ── nested objects and arrays ──────────────────────────────────────────────

  it('redacts sensitive keys nested inside an object', () => {
    const input = {
      user: {
        name: 'Alice',
        credentials: { password: 'secret123', role: 'admin' },
      },
    }
    const result = sanitize(input) as { user: { credentials: Record<string, unknown> } }
    expect(result.user.credentials.password).toBe('[REDACTED]')
    expect(result.user.credentials.role).toBe('admin')
  })

  it('redacts sensitive keys inside array elements', () => {
    const input = [{ username: 'bob', password: 'pw' }, { username: 'carol', password: 'pw2' }]
    const result = sanitize(input) as Array<Record<string, unknown>>
    expect(result[0].password).toBe('[REDACTED]')
    expect(result[1].password).toBe('[REDACTED]')
    expect(result[0].username).toBe('bob')
  })

  it('handles a deeply nested sensitive key', () => {
    const input = { a: { b: { c: { d: { password: 'deep' } } } } }
    const result = sanitize(input) as { a: { b: { c: { d: Record<string, unknown> } } } }
    expect(result.a.b.c.d.password).toBe('[REDACTED]')
  })

  // ── circular references ────────────────────────────────────────────────────

  it('handles circular references without throwing', () => {
    const obj: Record<string, unknown> = { name: 'test' }
    obj.self = obj
    expect(() => sanitize(obj)).not.toThrow()
    const result = sanitize(obj) as Record<string, unknown>
    expect(result.self).toBe('[Circular]')
  })

  // ── does not mutate the original ──────────────────────────────────────────

  it('does not mutate the original object', () => {
    const original = { password: 'original', name: 'Alice' }
    sanitize(original)
    expect(original.password).toBe('original')
  })
})

// ── createLogger() ─────────────────────────────────────────────────────────────

describe('createLogger() — log level filtering', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs all levels when minLevel is DEBUG', () => {
    const log = createLogger(undefined, 'DEBUG')
    log.debug('d')
    log.info('i')
    log.warn('w')
    log.error('e')
    log.fatal('f')
    expect(debugSpy).toHaveBeenCalledOnce()
    expect(infoSpy).toHaveBeenCalledOnce()
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledTimes(2) // ERROR + FATAL both use console.error
  })

  it('suppresses DEBUG when minLevel is INFO', () => {
    const log = createLogger(undefined, 'INFO')
    log.debug('should be suppressed')
    log.info('should appear')
    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledOnce()
  })

  it('suppresses DEBUG and INFO when minLevel is WARN', () => {
    const log = createLogger(undefined, 'WARN')
    log.debug('d')
    log.info('i')
    log.warn('w')
    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('only logs ERROR and FATAL when minLevel is ERROR', () => {
    const log = createLogger(undefined, 'ERROR')
    log.debug('d')
    log.info('i')
    log.warn('w')
    log.error('e')
    log.fatal('f')
    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })

  it('logs nothing when minLevel is FATAL and only non-fatal calls are made', () => {
    const log = createLogger(undefined, 'FATAL')
    log.debug('d')
    log.info('i')
    log.warn('w')
    log.error('e')
    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('sanitizes sensitive payload before logging', () => {
    const log = createLogger(undefined, 'DEBUG')
    log.info('checkout', { cardNumber: '4111111111111111', total: 99 })
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      expect.objectContaining({ cardNumber: '[REDACTED]', total: 99 }),
    )
  })

  it('includes the context label in the log output', () => {
    const log = createLogger('AuthContext', 'DEBUG')
    log.info('session refreshed')
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AuthContext]'),
      // no payload arg when none provided
    )
  })

  it('omits payload argument when no payload is given', () => {
    const log = createLogger(undefined, 'INFO')
    log.info('simple message')
    // console.info should be called with just the formatted string, not an extra arg
    const [, ...extra] = infoSpy.mock.calls[0]
    expect(extra).toHaveLength(0)
  })
})

describe('logger.child()', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('includes parent context in child log output', () => {
    const parent = createLogger('Parent', 'DEBUG')
    const child = parent.child('Child')
    child.info('hello')
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Parent:Child'),
    )
  })

  it('child of root logger (no parent context) includes child context only', () => {
    const root = createLogger(undefined, 'DEBUG')
    const child = root.child('Module')
    child.info('msg')
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Module]'),
    )
  })
})

// ── LOG_LEVELS export ─────────────────────────────────────────────────────────

describe('LOG_LEVELS', () => {
  it('exports the five expected levels in ascending order', () => {
    expect(LOG_LEVELS).toEqual(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'])
  })
})
