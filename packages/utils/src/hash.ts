// Cryptographic hash utilities
import { createHash } from 'crypto'

export function sha256(v: string): string {
  return createHash('sha256').update(v).digest('hex')
}
