import { QueryInterface } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'
import Activity, { IActivity, hashActivity } from './activity'
import Collection, { ICollection } from './collection'

const {
  POSTGRES_DB = 'storypoints',
  POSTGRES_USER = 'storypoints',
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_PASSWORD,
  POSTGRES_SSL,
} = process.env

if (!POSTGRES_DB || !POSTGRES_USER) {
  throw new Error('Database configuration not found')
}

const sequelize = new Sequelize(POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, {
  host: POSTGRES_HOST,
  port: POSTGRES_PORT ? parseInt(POSTGRES_PORT) : undefined,
  dialect: 'postgres',
  dialectOptions: {
    keepAlive: true,
    ssl:
      POSTGRES_SSL === 'true'
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : undefined,
  },
  logging: !!process.env.LOG_LEVEL,
})
sequelize.addModels([Activity, Collection])

export {
  QueryInterface,
  Sequelize,
  sequelize,
  hashActivity,
  Activity,
  IActivity,
  Collection,
  ICollection,
}
