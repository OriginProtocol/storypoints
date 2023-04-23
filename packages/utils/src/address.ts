// Ethereum address utilities
import { getAddress } from '@ethersproject/address'

import { buf2hex } from './hex'

/// Normalize string address
export function address(v: Buffer | string): string {
  return getAddress(v instanceof Buffer ? buf2hex(v) : v)
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
