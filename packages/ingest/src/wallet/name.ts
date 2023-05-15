import { address } from '@storypoints/utils'
import { getProvider } from '@storypoints/utils/eth'

/// Resolve ENS name
export async function resolveENS(
  walletAddress: Buffer | string
): Promise<string | null> {
  const provider = getProvider()
  return await provider.lookupAddress(address(walletAddress))
}
