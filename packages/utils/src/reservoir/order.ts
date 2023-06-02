import {
  GetOrderAskResponse,
  GetOrderBidResponse,
  ReservoirOrderAsk,
  ReservoirOrderBid,
} from '@origin/storypoints-types'

import { address } from '../address'
import { buf2hex } from '../hex'

import { fetchFromReservoir } from './fetch'

export async function getOrderAsks(
  contractAddress: Buffer,
  tokenId: string
): Promise<ReservoirOrderAsk[]> {
  const params = new URLSearchParams({
    sortBy: 'price',
    token: `${buf2hex(contractAddress)}:${tokenId}`,
  })
  const url = `/orders/asks/v4?${params.toString()}`
  const res = await fetchFromReservoir<GetOrderAskResponse>({ url })
  return res.orders ?? []
}

export async function getOrderBids(
  contractAddress: Buffer,
  maker: Buffer | string
): Promise<ReservoirOrderBid[]> {
  const params = new URLSearchParams({
    sortBy: 'price',
    collection: address(contractAddress),
    maker: address(maker),
  })
  const url = `/orders/bids/v4?${params.toString()}`
  const res = await fetchFromReservoir<GetOrderBidResponse>({ url })
  return res.orders ?? []
}
