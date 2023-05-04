import { buf2hex, hex2buf, sha256 } from '@storypoints/utils'
import {
  ActivityType,
  IActivity,
  IActivityContext,
  ReservoirCollectionActivity,
  ReservoirOrder,
} from '@storypoints/types'
import {
  AutoIncrement,
  BeforeCreate,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  //HasMany,
  HasOne,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript'

import Wallet from './wallet'

/// Hash an Activity to create a unique ident
export function hashActivity(act: IActivity) {
  // TODO: Should validate these are the best choice of props for uniqueness
  const hashValues = [
    act.type,
    act.walletAddress ? buf2hex(act.walletAddress) : '',
    buf2hex(act.contractAddress),
    +act.timestamp,
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
  orderBlob?: ReservoirOrder

  @Column({
    type: DataType.JSONB,
    field: 'context_blob',
  })
  contextBlob?: IActivityContext

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
    act.activityHash = hashActivity(act)
  }
}
