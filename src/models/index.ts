import { Sequelize, Dialect } from 'sequelize'
import allConfig from '../config/config.json'
import EventModel from './event'

interface Config {
  username: string
  password: string | null
  database: string
  host: string
  dialect: string
  use_env_variable?: string
}

type Env = 'development' | 'test' | 'production'

const env: Env = ['development', 'test', 'production'].includes(
  process.env.NODE_ENV as Env
)
  ? (process.env.NODE_ENV as Env)
  : 'development'

// const config: Config = require(__dirname + '/../../config.js')[env]
const config: Config = allConfig[env]

let sequelize: Sequelize
if (config.use_env_variable) {
  const connString = process.env[config.use_env_variable] ?? ''
  sequelize = new Sequelize(connString)
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password ?? undefined,
    {
      dialect: config.dialect as Dialect
    }
  )
}

const Event = EventModel(sequelize)

export { Sequelize, sequelize, Event }
