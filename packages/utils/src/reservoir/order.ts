import { GetOrderResponse, ReservoirOrder } from '@storypoints/types'
import { buf2hex } from '@storypoints/utils'

import { fetchFromReservoir } from './fetch'

export async function getCheapestOrder(
  contractAddress: Buffer,
  tokenId: string
): Promise<ReservoirOrder | undefined> {
  const params = new URLSearchParams({
    sortBy: 'price',
    token: `${buf2hex(contractAddress)}:${tokenId}`,
  })
  const url = `/orders/asks/v4?${params.toString()}`
  const res = await fetchFromReservoir<GetOrderResponse>({ url })
  return res.orders?.[0]
}
