// Ethereum address utilities
import { getAddress } from '@ethersproject/address'

import { toHex } from './hex'

/// Normalize string address
export function address(v: Buffer | string): string {
  return getAddress(toHex(v))
}

/// Check if string or buffer is an address
export function addressMaybe(v: unknown): string | undefined {
  if (v instanceof Buffer) {
    if (v.length !== 20) {
      return undefined
    }

    return address(v)
  } else if (typeof v === 'string') {
    try {
      return getAddress(v)
    } catch {
      /* pass */
    }
  }

  return undefined
}
