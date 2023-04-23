import { buf2hex, hex2buf, sha256 } from '@storypoints/utils'
import {
  AutoIncrement,
  BeforeCreate,
  Column,
  CreatedAt,
  DataType,
  Default,
  //HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript'

export interface IActivity {
  activityHash?: Buffer
  contractAddress: Buffer
  currency?: Buffer
  multiplier: number
  description?: string
  points: number
  price?: string
  timestamp: Date
  type: string
  walletAddress?: Buffer
  valid?: boolean
}

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

  @Column(DataType.STRING)
  type: string

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

  @Column(DataType.STRING)
  description: string

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date

  @BeforeCreate
  static hashActivity(act: Activity) {
    act.activityHash = hashActivity(act)
  }
}
