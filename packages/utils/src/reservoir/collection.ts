import { GetCollectionResponse, Price } from '@storypoints/types'
import { ZERO_ADDRESS, address, hex2buf } from '@storypoints/utils'

import { fetchFromReservoir } from './fetch'

const floorCache: Record<string, { floor: Price; stamp: number } | undefined> =
  {}

export async function getCollectionFloor(
  contractAddress: Buffer | string
): Promise<Price> {
  const collection = address(contractAddress)
  // 5 minute cache
  const now = +new Date()
  if ((floorCache[collection]?.stamp ?? 0) > now - 300 * 1000) {
    return floorCache[collection]?.floor ?? {}
  }

  const params = new URLSearchParams({
    id: collection,
  })
  const url = `/collections/v5?${params.toString()}`
  const res = await fetchFromReservoir<GetCollectionResponse>({ url })

  const floor = {
    amount: res.collections?.[0]?.floorAsk?.price?.amount?.raw ?? '0',
    currency: res.collections?.[0]?.floorAsk?.price?.currency?.contract
      ? hex2buf(res.collections[0].floorAsk.price.currency.contract)
      : ZERO_ADDRESS,
    amountUSD: res.collections?.[0]?.floorAsk?.price?.amount?.usd ?? 0,
  }

  if (floor.amountUSD > 0) {
    floorCache[collection] = {
      floor,
      stamp: now,
    }
  }

  return floor
}
