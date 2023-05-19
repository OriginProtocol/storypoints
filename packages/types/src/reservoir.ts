import { definitions, paths } from '@reservoir0x/reservoir-sdk'

export type ActivityType =
  | 'ask'
  | 'ask_cancel'
  | 'bid'
  | 'bid_cancel'
  | 'mint'
  | 'sale'
  | 'transfer'
  | 'unknown'

//Response type for https://docs.reservoir.tools/reference/getcollectionsactivityv6
export interface ReservoirActivityResponse {
  activities: ReservoirActivity[]
  continuation?: string
}

//Response type for https://docs.reservoir.tools/reference/getsalesv4
export interface SalesResponse {
  sales: Sale[]
  continuation: string
}

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

export interface Sale {
  id?: string
  saleId?: string
  token?: Token
  orderId?: string
  orderSource?: string
  orderSide?: string
  orderKind?: string
  from?: string
  to?: string
  amount?: string
  fillSource?: string
  block?: number
  txHash?: string
  logIndex?: number
  batchIndex?: number
  timestamp?: number
  price?: ReservoirPrice
  washTradingScore?: number
  paidFullRoyalty?: boolean
  feeBreakdown?: FeeBreakdown[]
}

export interface FeeBreakdown {
  kind: string
  bps: number
  recipient: string
}

export type GetCollectionParams =
  paths['/collections/v5']['get']['parameters']['query']
export type GetCollectionResponse =
  paths['/collections/v5']['get']['responses']['200']['schema']
export type GetCollectionActivityParams =
  paths['/collections/activity/v6']['get']['parameters']['query']
export type GetCollectionActivityResponse =
  paths['/collections/activity/v6']['get']['responses']['200']['schema']
export type ReservoirCollectionActivity = definitions['Model96']
export type GetOrderResponse =
  paths['/orders/asks/v4']['get']['responses']['200']['schema']
export type ReservoirOrder = definitions['Model151']

// TODO: Remove all refs to this, use sdk
export interface ReservoirActivity {
  type?: string
  fromAddress: string
  toAddress?: string | null
  price?: ReservoirPrice
  amount?: number
  timestamp?: number
  createdAt?: string
  contract?: string
  txHash?: string
  token?: Token & {
    tokenId?: string | null
    tokenName?: string | null
    tokenImage?: string | null
  }
  collection?: Collection & { collectionId: string; collectionImage: string }
  order?: {
    id?: string
    side?: string
    source?: {
      domain?: string
      name?: string
      icon?: string
    }
    criteria?: {
      kind?: string
      data?: {
        collection?: Collection & { id: string; name: string; image: string }
      }
    }
  }
}
