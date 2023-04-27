// Hexadecimal utilities

/// Add 0x prefix on a hex string
export function add0x(v: string): string {
  return v.startsWith('0x') ? v : `0x${v}`
}

/// Remove 0x prefix on a hex string
export function remove0x(v: string): string {
  return v.startsWith('0x') ? v.slice(2) : v
}

/// Hex string to Buffer
export function hex2buf(v?: string): Buffer {
  // Buffer.from('c4e91665c406adbe24d7a97bb23aaf92d789b458', 'hex').toString('hex')
  return Buffer.from(v ? remove0x(v) : '', 'hex')
}

/// Buffer to hex string
export function buf2hex(v: Buffer): string {
  return add0x(v.toString('hex'))
}

/// Compare two buffers for equality. Returns false if any are undefined
export function bufeq(a: Buffer | undefined, b: Buffer | undefined): boolean {
  return !!b && a?.compare(b) === 0
}
