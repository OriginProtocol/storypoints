import { address } from '@origin/storypoints-utils'
import { getOGN } from '@origin/storypoints-utils/eth'

/// Fetch an accounts OGN stake
export async function getOGNStake(
  walletAddress: Buffer | string
): Promise<bigint> {
  const ogn = getOGN()
  return (await ogn.balanceOf(
    typeof walletAddress === 'string' && walletAddress.endsWith('.eth')
      ? walletAddress
      : address(walletAddress)
  )) as bigint
}
