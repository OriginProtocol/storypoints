import {
  address,
  addressMaybe,
  buf2hex,
  hex2buf,
  sha256,
} from '@origin/storypoints-utils'
import {
  ActivityType,
  IActivity,
  IActivityContext,
  JSONObject,
  JSONValue,
  ReservoirCollectionActivity,
  ReservoirOrderAsk,
  ReservoirOrderBid,
  ReservoirSale,
} from '@origin/storypoints-types'
import { TransactionResponse } from 'ethers'
import pick from 'lodash/pick'
import {
  AutoIncrement,
  BeforeCreate,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript'

import Wallet from './wallet'

/// Hash an Activity to create a unique ident
export function hashActivity(act: IActivity) {
  const hashValues = [
    act.type,
    act.walletAddress ? buf2hex(act.walletAddress) : '',
    buf2hex(act.contractAddress),
    +act.timestamp,
    act.reservoirOrderId ? buf2hex(act.reservoirOrderId) : '',
  ]
  return hex2buf(sha256(hashValues.join('-')))
}

@Table({ tableName: 'activity' })
export default class Activity extends Model implements IActivity {
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.INTEGER)
  id: number

  @Default(true)
  @Column(DataType.BOOLEAN)
  valid: boolean

  @Column(DataType.DECIMAL)
  points: number

  @Column(DataType.BLOB)
  currency: Buffer

  // Storing BigNumbers, not decimals
  @Column(DataType.DECIMAL)
  price: string

  // Storing BigNumbers, not decimals
  @Column({
    type: DataType.FLOAT,
    field: 'price_usd',
  })
  priceUSD: number

  @Column(DataType.STRING)
  type: ActivityType

  @Column({
    type: DataType.BLOB,
    field: 'contract_address',
  })
  contractAddress: Buffer

  @Column({
    type: DataType.BLOB,
    field: 'wallet_address',
  })
  walletAddress: Buffer

  @Column({
    type: DataType.STRING,
    field: 'activity_hash',
  })
  activityHash?: Buffer

  @Column(DataType.DATE)
  timestamp: Date

  @Default(1)
  @Column({ type: DataType.FLOAT, field: 'multiplier' })
  multiplier: number

  @Default(1)
  @Column({ type: DataType.FLOAT, field: 'adjustment_multiplier' })
  adjustmentMultiplier: number

  @Column(DataType.STRING)
  description: string

  @Column({
    type: DataType.BLOB,
    field: 'reservoir_order_id',
  })
  reservoirOrderId?: Buffer

  @Column({
    type: DataType.JSONB,
    field: 'activity_blob',
  })
  activityBlob: ReservoirCollectionActivity

  @Column({
    type: DataType.JSONB,
    field: 'order_blob',
  })
  orderBlob?: ReservoirOrderAsk | ReservoirOrderBid

  @Column({
    type: DataType.JSONB,
    field: 'context_blob',
  })
  contextBlob?: IActivityContext

  @Column({
    type: DataType.JSONB,
    field: 'sale_blob',
  })
  saleBlob?: ReservoirSale

  @Column({
    type: DataType.JSONB,
    field: 'transaction_blob',
  })
  transactionBlob?: TransactionResponse

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date

  @Column(DataType.STRING)
  reason?: string

  @BelongsTo(() => Wallet, {
    constraints: false,
    foreignKey: 'wallet_address',
  })
  wallet: Wallet

  @BeforeCreate
  static hashActivity(act: Activity) {
    if (!act.activityHash) act.activityHash = hashActivity(act)
  }

  // TODO: can/should toJSON() be overridden?
  json(): JSONObject {
    const contextBlob: JSONValue = this.contextBlob
      ? {
          cheapestOrder: this.contextBlob.cheapestOrder,
          collectionFloorPrice: {
            amount: this.contextBlob.collectionFloorPrice?.amount,
            amountUSD: this.contextBlob.collectionFloorPrice?.amountUSD,
            currency: addressMaybe(
              this.contextBlob.collectionFloorPrice?.currency
            ),
          },
          userOgnStake: this.contextBlob.userOgnStake,
        }
      : {}

    return {
      ...(pick(this.dataValues, [
        'id',
        'valid',
        'points',
        'price',
        'priceUSD',
        'type',
        'timestamp',
        'multiplier',
        'adjustmentMultiplier',
        'description',
        'createdAt',
        'updatedAt',
        'reason',
      ]) as JSONObject),
      activityHash: this.activityHash ? buf2hex(this.activityHash) : null,
      contextBlob,
      contractAddress: address(this.contractAddress),
      currency: address(this.currency),
      reservoirOrderId: this.reservoirOrderId
        ? buf2hex(this.reservoirOrderId)
        : null,
      walletAddress: address(this.walletAddress),
    }
  }
}
