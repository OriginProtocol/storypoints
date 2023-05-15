import fetch from 'node-fetch'
import { FixedNumber } from 'ethers'

const RATE_ENDPOINT = 'https://app.story.xyz/api/payments/exchange-rates'
const RATE_CACHE: Record<string, { stamp: number; rate: bigint } | undefined> =
  {}
const SCALE = 100000000n

// Get the USD value for n ETH
export async function ethToUSD(n: bigint): Promise<number> {
  if (!RATE_CACHE.ETH_USD || RATE_CACHE.ETH_USD.stamp < +new Date() - 300) {
    const response = await fetch(RATE_ENDPOINT)
    const data = (await response.json()) as {
      success: boolean
      rates: { ETH_USD: string }
    }
    RATE_CACHE.ETH_USD = {
      stamp: +new Date(),
      rate: BigInt(data.rates.ETH_USD),
    }
  }

  return FixedNumber.fromValue(
    (RATE_CACHE.ETH_USD.rate * n) / SCALE,
    18
  ).toUnsafeFloat()
}
