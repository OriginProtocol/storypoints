import { definitions, paths } from '@reservoir0x/reservoir-sdk'

export type ActivityType =
  | 'ask'
  | 'ask_cancel'
  | 'bid'
  | 'bid_cancel'
  | 'mint'
  | 'sale'
  | 'synthetic'
  | 'transfer'
  | 'unknown'

export interface Currency {
  contract: string
  name: string
  symbol: string
  decimals: number
}

export interface Collection {
  id: string | null
  name: string | null
}

export interface Token {
  contract: string
  tokenId: string
  name: string | null
  image: string | null
  collection: Collection
}

export interface PriceAmount {
  raw: string
  decimal: number
  usd: number
  native: number
}

export interface ReservoirPrice {
  currency: Currency
  amount: PriceAmount
}

export interface FeeBreakdown {
  kind: string
  bps: number
  recipient: string
}

// Ref: https://github.com/reservoirprotocol/reservoir-kit/blob/main/packages/sdk/src/types/api.ts
export type GetCollectionParams =
  paths['/collections/v5']['get']['parameters']['query']
export type GetCollectionResponse =
  paths['/collections/v5']['get']['responses']['200']['schema']
export type GetCollectionActivityParams =
  paths['/collections/activity/v6']['get']['parameters']['query']
export type GetCollectionActivityResponse =
  paths['/collections/activity/v6']['get']['responses']['200']['schema']
export type ReservoirCollectionActivities =
  GetCollectionActivityResponse['activities']
export type ReservoirCollectionActivity =
  NonNullable<ReservoirCollectionActivities>['0']
export type GetSalesResponse =
  paths['/sales/v4']['get']['responses']['200']['schema']
export type ReservoirSales = GetSalesResponse['sales']
export type ReservoirSale = NonNullable<ReservoirSales>['0']
export type GetOrderAskResponse =
  paths['/orders/asks/v4']['get']['responses']['200']['schema']
export type ReservoirOrderAsks = GetOrderAskResponse['orders']
export type ReservoirOrderAsk = NonNullable<ReservoirOrderAsks>['0']
export type GetOrderBidResponse =
  paths['/orders/bids/v4']['get']['responses']['200']['schema']
export type ReservoirOrderBids = GetOrderBidResponse['orders']
export type ReservoirOrderBid = NonNullable<ReservoirOrderBids>['0']
