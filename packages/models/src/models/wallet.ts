import { IWallet } from '@origin/storypoints-types'
import {
  Column,
  CreatedAt,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript'

import Activity from './activity'

@Table({ tableName: 'wallet' })
export default class Wallet extends Model implements IWallet {
  @PrimaryKey
  @Column(DataType.BLOB)
  address: Buffer

  // Storing BigNumbers, not decimals
  @Column({ type: DataType.DECIMAL, field: 'ogn_stake' })
  ognStake: string

  @Column({ type: DataType.STRING, field: 'ens_name' })
  ensName: string

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date

  @HasMany(() => Activity, { constraints: false, foreignKey: 'walletAddress' })
  activities: Activity[]
}
