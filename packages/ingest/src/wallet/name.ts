import { address } from '@storypoints/utils'
import { getMainnetProvider } from '@storypoints/utils/eth'

/// Resolve ENS name
export async function resolveENS(
  walletAddress: Buffer | string
): Promise<string | null> {
  const provider = getMainnetProvider()
  return await provider.lookupAddress(address(walletAddress))
}
