import { Price } from './base'
import {
  ActivityType,
  ReservoirCollectionActivity,
  ReservoirOrder,
} from './reservoir'

export interface IActivityContext {
  cheapestOrder?: boolean
  collectionFloorPrice?: Price
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
  orderBlob?: ReservoirOrder
  points: number
  price?: string
  priceUSD?: number
  reservoirOrderId?: Buffer
  timestamp: Date
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
