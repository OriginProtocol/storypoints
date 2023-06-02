import { TransactionResponse } from 'ethers'
import { Price } from './base'
import {
  ActivityType,
  ReservoirCollectionActivity,
  ReservoirOrderAsk,
  ReservoirOrderBid,
  ReservoirSale,
} from './reservoir'

export interface IActivityContext {
  cheapestOrder?: boolean
  collectionFloorPrice?: Price
  duplicateOrder?: boolean
  userOgnStake?: string
}

export interface IActivity {
  activityHash?: Buffer
  activityBlob: ReservoirCollectionActivity
  contractAddress: Buffer
  contextBlob?: IActivityContext
  currency?: Buffer
  multiplier: number
  description?: string
  orderBlob?: ReservoirOrderAsk | ReservoirOrderBid
  points: number
  price?: string
  priceUSD?: number
  reservoirOrderId?: Buffer
  reason?: string
  saleBlob?: ReservoirSale
  timestamp: Date
  transactionBlob?: TransactionResponse
  type: ActivityType
  walletAddress?: Buffer
  valid?: boolean
}

export interface ICollection {
  contractAddress: Buffer
  description?: string
  disabled?: boolean
}

export interface IWallet {
  address: Buffer
  ensName?: string
  ognStake?: string
}
