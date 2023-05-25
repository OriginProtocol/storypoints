// Input handlers
import { addressMaybe } from '@origin/storypoints-utils'

export function integer(v: unknown, defaultValue = 0): number {
  if (typeof v === 'number') {
    return Math.floor(v)
  } else if (typeof v === 'string') {
    try {
      return parseInt(v)
    } catch {
      /* pass */
    }
  }

  return defaultValue
}

export function number(v: unknown, defaultValue = 0): number {
  if (typeof v === 'number') {
    return v
  } else if (typeof v === 'string') {
    try {
      return parseFloat(v)
    } catch {
      /* pass */
    }
  }

  return defaultValue
}

export function address(v: unknown, defaultValue: string): string {
  const aout = addressMaybe(v)
  return aout ?? defaultValue
}

export function addresses(v: string): string[] {
  return v
    .split(',')
    .map((a) => addressMaybe(a))
    .filter((a) => a) as string[]
}

export function string(v: string, defaultValue?: string): string {
  // TODO: More filtering here?
  return (v || defaultValue) ?? ''
}

export function stringOptions<T = string>(
  v: unknown,
  options: string[],
  defaultValue?: T
): T {
  return (
    typeof v === 'string'
      ? options.includes(v)
        ? v
        : defaultValue
      : defaultValue
  ) as T
}

export function bigint(v: unknown, defaultValue: bigint): bigint {
  if (['string', 'number', 'bigint', 'boolean'].includes(typeof v)) {
    try {
      return BigInt(v as string | number | bigint | boolean)
    } catch {
      /* pass */
    }
  }
  return defaultValue
}

export function bigintMaybe(
  v: unknown,
  defaultValue?: bigint | null
): bigint | null {
  if (['string', 'number', 'bigint', 'boolean'].includes(typeof v)) {
    try {
      return BigInt(v as string | number | bigint | boolean)
    } catch {
      /* pass */
    }
  }
  return defaultValue ?? null
}

export function date(v: unknown, defaultValue: Date): Date {
  if (['string', 'number'].includes(typeof v)) {
    try {
      return new Date(typeof v === 'number' ? v : parseInt(v as string))
    } catch {
      /* pass */
    }
  }

  return defaultValue
}
