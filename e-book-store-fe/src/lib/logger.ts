/**
 * Structured logger for Bibliophile.
 *
 * Features:
 *  - Five log levels: DEBUG < INFO < WARN < ERROR < FATAL
 *  - Minimum level controlled by VITE_LOG_LEVEL (defaults to INFO in
 *    production, DEBUG in development).
 *  - Deep-clones and scrubs sensitive keys before any value reaches
 *    the console, so passwords, card numbers, CVVs, and tokens are
 *    never logged.
 */

// ── Log levels ────────────────────────────────────────────────────────────────

export const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

const LEVEL_RANK: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
}

// ── Sensitive-key patterns ────────────────────────────────────────────────────

/**
 * Any object key whose lowercase form matches one of these patterns will have
 * its value replaced with `"[REDACTED]"`.
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /access_token/i,
  /refresh_token/i,
  /api_?key/i,
  /card_?number/i,
  /cardnumber/i,
  /cvv/i,
  /cvc/i,
  /expir/i,         // expiry, expiration, exp_month, exp_year
  /credit_?card/i,
  /debit_?card/i,
  /pan\b/i,         // Primary Account Number
  /ssn/i,
  /social_?security/i,
  /authorization/i, // HTTP Authorization header
]

const REDACTED = '[REDACTED]'

// ── Sanitization helpers ──────────────────────────────────────────────────────

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(key))
}

/**
 * Deep-clones `value` and replaces any sensitive key's value with
 * `"[REDACTED]"`. Handles plain objects, arrays, and primitives. Circular
 * references are broken via a WeakSet.
 */
export function sanitize(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (seen.has(value as object)) {
    return '[Circular]'
  }
  seen.add(value as object)

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, seen))
  }

  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = isSensitiveKey(k) ? REDACTED : sanitize(v, seen)
  }
  return result
}

// ── Logger implementation ─────────────────────────────────────────────────────

function resolveMinLevel(): LogLevel {
  // Allow override through env; fall back to DEBUG in dev, INFO in prod.
  const envLevel = (
    typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_LOG_LEVEL as string | undefined) : undefined
  )?.toUpperCase() as LogLevel | undefined

  if (envLevel && LEVEL_RANK[envLevel] !== undefined) {
    return envLevel
  }

  const isDev =
    typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
      ? import.meta.env.DEV === true
      : true

  return isDev ? 'DEBUG' : 'INFO'
}

const CONSOLE_METHOD: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'error',
}

export interface LogEntry {
  level: LogLevel
  message: string
  context?: string
  payload?: unknown
  timestamp: string
}

export interface Logger {
  debug(message: string, payload?: unknown): void
  info(message: string, payload?: unknown): void
  warn(message: string, payload?: unknown): void
  error(message: string, payload?: unknown): void
  fatal(message: string, payload?: unknown): void
  child(context: string): Logger
}

function createLogger(context?: string, minLevel?: LogLevel): Logger {
  const effectiveMinLevel = minLevel ?? resolveMinLevel()

  function log(level: LogLevel, message: string, payload?: unknown): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[effectiveMinLevel]) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
      ...(payload !== undefined ? { payload: sanitize(payload) } : {}),
    }

    const method = CONSOLE_METHOD[level]
    console[method](`[${entry.level}]${context ? ` [${context}]` : ''} ${message}`, ...(payload !== undefined ? [entry.payload] : []))
  }

  return {
    debug: (msg, payload) => log('DEBUG', msg, payload),
    info: (msg, payload) => log('INFO', msg, payload),
    warn: (msg, payload) => log('WARN', msg, payload),
    error: (msg, payload) => log('ERROR', msg, payload),
    fatal: (msg, payload) => log('FATAL', msg, payload),
    child: (childContext: string) =>
      createLogger(context ? `${context}:${childContext}` : childContext, effectiveMinLevel),
  }
}

/** Application-wide logger instance. */
export const logger: Logger = createLogger()

export { createLogger }
