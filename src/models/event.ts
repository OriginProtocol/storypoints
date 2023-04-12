'use strict'

import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Sequelize,
  DataTypes
} from 'sequelize'

// order of InferAttributes & InferCreationAttributes is important.
class Event extends Model<
  InferAttributes<Event>,
  InferCreationAttributes<Event>
> {
  [x: string]: any
  declare id: CreationOptional<number>
  declare points: CreationOptional<number>
  declare currency: CreationOptional<string>
  declare price: CreationOptional<number>
  declare type: CreationOptional<string>
  declare contractAddress: string
  declare walletAddress: string
  declare eventHash: CreationOptional<string>
  declare timestamp: CreationOptional<Date>
  declare ognStakedMultiplier: CreationOptional<number>
  declare collectionVolumeMultiplier: CreationOptional<number>
  declare moderationMultiplier: CreationOptional<number>
  declare description: CreationOptional<string>
}

export default (sequelize: Sequelize) => {
  Event.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: true
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      type: {
        type: DataTypes.STRING,
        allowNull: true
      },
      contractAddress: {
        type: DataTypes.STRING,
        allowNull: true
      },
      walletAddress: DataTypes.STRING,
      eventHash: {
        type: DataTypes.STRING,
        allowNull: true
      },
      timestamp: DataTypes.DATE,
      ognStakedMultiplier: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      collectionVolumeMultiplier: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      moderationMultiplier: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Event'
    }
  )

  Event.addHook('beforeCreate', (event: Event) => {
    event.eventHash =
      event.eventHash ||
      `${event.type}-${event.walletAddress}-${event.contractAddress}`
  })

  return Event
}
