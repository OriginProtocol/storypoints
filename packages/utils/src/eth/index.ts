import { Contract, JsonRpcProvider } from 'ethers'

interface OGN extends Contract {
  balanceOf(address: string): Promise<bigint>
}

let ogn: Contract | undefined
let provider: JsonRpcProvider | undefined

export const E_18 = BigInt('1000000000000000000')

export function getProvider(): JsonRpcProvider {
  if (!provider) {
    provider = new JsonRpcProvider(process.env.JSON_PRC_PROVIDER)
  }

  return provider
}

export function getOGN(): OGN {
  if (!ogn) {
    ogn = new Contract(
      '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
      ['function balanceOf(address owner) view returns (uint256)'],
      getProvider()
    )
  }

  return ogn
}
