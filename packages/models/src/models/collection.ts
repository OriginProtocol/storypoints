import { ICollection } from '@storypoints/types'
import {
  AutoIncrement,
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript'

@Table({ tableName: 'collection' })
export default class Collection extends Model implements ICollection {
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.INTEGER)
  id: number

  @Default(false)
  @Column(DataType.BOOLEAN)
  disabled: boolean

  @Column({
    type: DataType.BLOB,
    field: 'contract_address',
  })
  contractAddress: Buffer

  @Column(DataType.STRING)
  description: string

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt: Date
}
