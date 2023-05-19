import { address, logger } from '@storypoints/utils'
import { getMainnetProvider } from '@storypoints/utils/eth'

const log = logger.child({ app: 'ingest', module: 'wallet' })

/// Resolve ENS name
export async function resolveENS(
  walletAddress: Buffer | string
): Promise<string | null> {
  try {
    const provider = getMainnetProvider()
    return await provider.lookupAddress(address(walletAddress))
  } catch (err) {
    log.error(err, `Error resolving name for address ${address(walletAddress)}`)
  }

  return null
}
