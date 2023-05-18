import { Contract, JsonRpcProvider } from 'ethers'

let ogn: Contract | undefined
let provider: JsonRpcProvider | undefined
let mainnetProvider: JsonRpcProvider | undefined

export const E_18 = BigInt('1000000000000000000')
export const ZERO_ADDRESS = Buffer.from(
  '0000000000000000000000000000000000000000',
  'hex'
)

export function getProvider(): JsonRpcProvider {
  const url = process.env.JSON_RPC_PROVIDER
  if (!url) throw new Error('JSON_RPC_PROVIDER is undefined')
  if (!provider) {
    provider = new JsonRpcProvider(url)
  }

  return provider
}

export function getMainnetProvider(): JsonRpcProvider {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const url = process.env.JSON_RPC_PROVIDER_MAINNET
  if (!url) throw new Error('JSON_RPC_PROVIDER_MAINNET are undefined')
  if (!mainnetProvider) {
    mainnetProvider = new JsonRpcProvider(url)
  }

  return mainnetProvider
}

export function getOGN(): Contract {
  if (!ogn) {
    const provi = getMainnetProvider()
    ogn = new Contract(
      '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
      ['function balanceOf(address owner) view returns (uint256)'],
      provi
    )
  }

  return ogn
}
