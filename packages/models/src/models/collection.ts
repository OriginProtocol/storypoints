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

export interface ICollection {
  contractAddress: Buffer
  description?: string
  disabled?: boolean
}

@Table({ tableName: 'activity' })
export default class Collection extends Model implements ICollection {
  @AutoIncrement
  @PrimaryKey
  @Column(DataType.INTEGER)
  id: number

  @Default(false)
  @Column(DataType.BOOLEAN)
  disabled: boolean

  @Column(DataType.BLOB)
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
