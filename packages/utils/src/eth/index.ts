import { Contract, JsonRpcProvider } from 'ethers'

let ogn: Contract | undefined
let provider: JsonRpcProvider | undefined

export const E_18 = BigInt('1000000000000000000')
export const ZERO_ADDRESS = Buffer.from(
  '0000000000000000000000000000000000000000',
  'hex'
)

export function getProvider(): JsonRpcProvider {
  if (!process.env.JSON_PRC_PROVIDER)
    throw new Error('JSON_PRC_PROVIDER is undefined')
  if (!provider) {
    provider = new JsonRpcProvider(process.env.JSON_PRC_PROVIDER)
  }

  return provider
}

export function getOGN(): Contract {
  if (!ogn) {
    ogn = new Contract(
      '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
      ['function balanceOf(address owner) view returns (uint256)'],
      getProvider()
    )
  }

  return ogn
}
