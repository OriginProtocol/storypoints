// Input handlers
import { addressMaybe } from '@storypoints/utils'

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

export function stringOptions(
  v: unknown,
  options: string[],
  defaultValue: string
): string {
  return typeof v === 'string'
    ? options.includes(v)
      ? v
      : defaultValue
    : defaultValue
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
