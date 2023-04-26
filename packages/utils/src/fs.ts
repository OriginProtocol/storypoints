import fs from 'fs/promises'

/// Check if a given path is a directory
export async function isDir(pth: string): Promise<boolean> {
  try {
    return (await fs.stat(pth)).isDirectory()
  } catch {
    /* pass */
  }
  return false
}
